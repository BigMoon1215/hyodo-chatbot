import os

print("현재 작업 폴더:", os.getcwd())
print("app.py 위치:", os.path.abspath(__file__))
print("static 위치:", os.path.abspath("static"))

from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
from google import genai

load_dotenv()

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)

# 새 패키지 방식으로 클라이언트 초기화
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODEL_NAME = "gemini-2.5-flash"


# ======================
# 채팅 답변 생성 (제주 방언)
# ======================

def generate_response(user_input):

    system_prompt = """
    너는 제주 방언 챗봇이다.
    친절한 제주 노년층 말투로 답변해라.
    """

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=f"{system_prompt}\n\n사용자 입력:\n{user_input}"
    )

    return response.text


# ======================
# 검색 답변 생성 (간결하게)
# ======================

def generate_search_response(query):

    system_prompt = """
    너는 어르신을 위한 쉬운 검색 도우미야.
    아래 규칙을 반드시 지켜라:
    - 검색 결과를 3문장 이내로 아주 간결하게 요약해라.
    - 어려운 단어 없이 쉬운 우리말로만 설명해라.
    - 핵심 내용만 담아라. 불필요한 인사말이나 부연 설명은 하지 마라.
    - 마크다운 기호(**, ##, - 등)는 절대 사용하지 마라.
    """

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=f"{system_prompt}\n\n검색어:\n{query}"
    )

    return response.text


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():

    data = request.get_json()

    if not data or not data.get("message"):
        return jsonify({"error": "메시지가 없습니다."}), 400

    user_message = data.get("message")

    try:
        reply = generate_response(user_message)
        return jsonify({"reply": reply})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/search", methods=["POST"])
def search():

    data = request.get_json()

    if not data or not data.get("query"):
        return jsonify({"error": "검색어가 없습니다."}), 400

    query = data.get("query")

    try:
        result = generate_search_response(query)
        return jsonify({"result": result})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)