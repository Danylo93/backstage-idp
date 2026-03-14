FROM python:${{ values.pythonVersion }}-slim
WORKDIR /app
COPY src/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src
CMD ["python", "src/main.py"]
