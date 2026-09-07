FROM python:3.11-slim

WORKDIR /app

# 의존성 먼저 설치(레이어 캐시)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드
COPY app ./app

# SQLite 영속 데이터 디렉터리(docker-compose에서 volume 마운트 대상)
RUN mkdir -p /app/data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
