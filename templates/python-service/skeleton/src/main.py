from flask import Flask

app = Flask(__name__)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    return {"status": "ready"}


@app.get("/info")
def info():
    return {
        "service": "${{ values.name }}",
        "owner": "${{ values.owner }}",
        "system": "${{ values.system }}",
    }


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
