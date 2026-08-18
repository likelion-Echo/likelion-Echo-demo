"""Gmail SMTP를 통한 사망 분류 알림 메일 발송.

SMTP 자격증명은 코드나 DB에 저장하지 않고 Cloud Run 환경변수로만 받는다.
"""

import html
import os
import smtplib
from email.message import EmailMessage
from urllib.parse import quote

from fastapi import HTTPException


def _smtp_settings() -> tuple[str, int, str, str, str]:
    sender = os.getenv("SMTP_EMAIL", "").strip()
    password = os.getenv("SMTP_APP_PASSWORD", "").strip()
    app_url = os.getenv("FRONTEND_APP_URL", "").strip().rstrip("/")
    host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip() or "smtp.gmail.com"
    try:
        port = int(os.getenv("SMTP_PORT", "465"))
    except ValueError:
        raise HTTPException(503, "SMTP_PORT 설정이 올바르지 않습니다.")
    if not sender or not password or not app_url:
        raise HTTPException(
            503,
            "메일 발송 설정이 없습니다. SMTP_EMAIL, SMTP_APP_PASSWORD, FRONTEND_APP_URL을 설정해주세요.",
        )
    return host, port, sender, password, app_url


def send_death_invitation(
    *,
    recipient_email: str,
    recipient_name: str,
    owner_name: str,
    events: list[tuple[str, str]],
) -> None:
    """한 수신자에게 배정된 모든 미래 메시지 링크를 한 통으로 보낸다."""
    host, port, sender, password, app_url = _smtp_settings()
    links = [
        (event_name, f"{app_url}/login?invite={quote(invite_code, safe='')}")
        for event_name, invite_code in events
    ]
    text_links = "\n".join(f"- {event_name}: 메시지를 확인하세요 {url}" for event_name, url in links)
    html_links = "".join(
        f'<li>{html.escape(event_name)}: '
        f'<a href="{html.escape(url, quote=True)}">메시지를 확인하세요</a></li>'
        for event_name, url in links
    )

    message = EmailMessage()
    message["Subject"] = f"{owner_name}님이 남긴 메시지가 도착했어요"
    message["From"] = f"Echo <{sender}>"
    message["To"] = recipient_email
    message.set_content(
        f"{recipient_name}님,\n\n"
        f"관리자 확인에 따라 {owner_name}님이 미리 남긴 메시지를 전달합니다.\n"
        "아래 링크를 열어 Echo에 로그인하거나 가입하면 메시지를 확인할 수 있습니다.\n\n"
        f"{text_links}\n\n"
        "이 메일을 요청하지 않았다면 링크를 열지 마세요."
    )
    message.add_alternative(
        f"<p>{html.escape(recipient_name)}님,</p>"
        f"<p>관리자 확인에 따라 {html.escape(owner_name)}님이 미리 남긴 메시지를 전달합니다.</p>"
        "<p>아래 링크를 열어 Echo에 로그인하거나 가입하면 메시지를 확인할 수 있습니다.</p>"
        f"<ul>{html_links}</ul>"
        "<p>이 메일을 요청하지 않았다면 링크를 열지 마세요.</p>",
        subtype="html",
    )

    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=20) as smtp:
                smtp.login(sender, password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=20) as smtp:
                smtp.starttls()
                smtp.login(sender, password)
                smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise HTTPException(502, "메일을 발송하지 못했습니다. Gmail SMTP 설정을 확인해주세요.") from exc
