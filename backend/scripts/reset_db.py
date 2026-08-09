"""테이블을 모두 지우고 다시 만든다. 스키마가 바뀌었을 때 사용한다.

    cd backend
    .venv\\Scripts\\python scripts/reset_db.py
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from app import models  # noqa: F401  (테이블 등록)
from app.db import Base, engine, init_db


def main():
    Base.metadata.drop_all(engine)
    init_db()
    print("DB를 초기화했습니다. 서버를 다시 실행하면 가치관 질문이 다시 채워집니다.")


if __name__ == "__main__":
    main()
