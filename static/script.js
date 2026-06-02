// ======================
// 전역 변수
// ======================

let isLargeText = false;
let registeredAlarms = [];

console.log("script.js 로드 성공");


// ======================
// 페이지 이동
// ======================

function goToPage(pageId) {

    const pages = [
        "page-main",
        "page-chat",
        "page-medication",
        "page-routine",
        "page-search"
    ];

    pages.forEach(id => {

        const page = document.getElementById(id);

        if (page) {
            page.classList.toggle(
                "hidden",
                id !== `page-${pageId}`
            );
        }
    });

    window.scrollTo(0, 0);
}


// ======================
// 글자 크기 변경
// ======================

function toggleGlobalTextSize() {

    const body = document.getElementById("app-body");
    const indicator = document.getElementById("size-indicator");

    isLargeText = !isLargeText;

    if (isLargeText) {
        body.classList.remove("size-normal");
        body.classList.add("size-large");
        if (indicator) indicator.textContent = "보통으로";
    } else {
        body.classList.remove("size-large");
        body.classList.add("size-normal");
        if (indicator) indicator.textContent = "더 크게";
    }
}


// ======================
// 채팅 말풍선
// ======================

function appendChatMessage(sender, text) {

    const win = document.getElementById("chat-window");
    if (!win) return;

    const wrapper = document.createElement("div");

    wrapper.className =
        sender === "bot"
            ? "flex items-start space-x-2"
            : "flex justify-end";

    const bubble = document.createElement("div");

    bubble.className =
        sender === "bot"
            ? "bg-blue-50 text-gray-800 p-4 rounded-3xl rounded-tl-none shadow-sm font-black max-w-[80%] text-left"
            : "bg-yellow-100 text-gray-800 p-4 rounded-3xl rounded-tr-none shadow-sm font-black max-w-[80%] text-left";

    bubble.textContent = text;

    wrapper.appendChild(bubble);
    win.appendChild(wrapper);
    win.scrollTop = win.scrollHeight;
}


// ======================
// Gemini 전송
// ======================

async function sendMessage(message) {

    try {

        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();

        // ✅ 버그 수정: reply가 있으면 정상 출력, error가 있으면 에러 메시지 표시
        if (data.reply) {
            appendChatMessage("bot", data.reply);
        } else if (data.error) {
            console.error("서버 오류:", data.error);
            appendChatMessage("bot", "죄송해요, 답변을 가져오지 못했어요. 다시 시도해 주세요.");
        }

    } catch (error) {

        console.error("네트워크 오류:", error);
        appendChatMessage("bot", "인터넷 연결을 확인해 주세요.");
    }
}


// ======================
// 전송 버튼
// ======================

async function processLocalChat() {

    const input = document.getElementById("user-input");
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    appendChatMessage("user", message);
    input.value = "";

    await sendMessage(message);
}


// ======================
// 엔터키 전송
// ======================

document.addEventListener("DOMContentLoaded", () => {

    const input = document.getElementById("user-input");

    if (input) {
        input.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                processLocalChat();
            }
        });
    }
});


// ======================
// 루틴 추가
// ======================

function addRoutine() {

    const input = document.getElementById("new-routine-text");
    if (!input) return;

    const text = input.value.trim();

    if (!text) {
        alert("내용을 입력해주세요.");
        return;
    }

    const list = document.getElementById("routine-list");

    const label = document.createElement("label");
    label.className = "flex items-start p-4 bg-yellow-50 rounded-2xl border-2 border-yellow-200 gap-3";
    label.innerHTML = `
        <input type="checkbox" class="w-9 h-9">
        <span class="font-black text-gray-800">${text}</span>
    `;

    list.appendChild(label);
    input.value = "";
}


// ======================
// 약 등록
// ======================

function addMedication() {

    const name = document.getElementById("med-name").value.trim();
    const time = document.getElementById("custom-time-input").value;

    if (!name || !time) {
        alert("약 이름과 시간을 입력해주세요.");
        return;
    }

    const list = document.getElementById("med-list");

    const li = document.createElement("li");
    li.className = "bg-green-50 p-4 rounded-2xl";
    li.innerHTML = `<strong>${time}</strong> - ${name}`;

    list.appendChild(li);

    registeredAlarms.push({ name, time });

    document.getElementById("med-name").value = "";
}


// ======================
// 검색
// ======================

async function executeEasySearch() {

    const query = document.getElementById("easy-search-query").value.trim();
    if (!query) return;

    const resultBox = document.getElementById("search-results");
    const resultText = document.getElementById("search-result-text");

    // 로딩 표시
    resultBox.classList.remove("hidden");
    resultText.textContent = "🔍 찾고 있어요, 잠깐만 기다려 주세요...";

    try {

        const response = await fetch("/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ query: query })
        });

        const data = await response.json();

        if (data.result) {
            resultText.textContent = data.result;
        } else if (data.error) {
            // ✅ 실제 에러 내용을 화면에 표시해서 원인 파악 가능하게 함
            console.error("검색 오류:", data.error);
            resultText.textContent = "❌ 오류: " + data.error;
        }

    } catch (error) {

        console.error("네트워크 오류:", error);
        resultText.textContent = "인터넷 연결을 확인해 주세요.";
    }
}


// ======================
// STT - 채팅
// ======================

function simulateChatSTT() {

    const indicator = document.getElementById("voice-indicator");

    if (!('webkitSpeechRecognition' in window)) {
        alert("이 브라우저는 음성인식을 지원하지 않습니다.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;

    indicator.classList.remove("hidden");
    recognition.start();

    recognition.onresult = function (event) {
        const text = event.results[0][0].transcript;
        document.getElementById("user-input").value = text;
        processLocalChat();
    };

    recognition.onerror = function (event) {
        console.error("STT 오류:", event.error);
        alert("음성 인식에 실패했습니다.");
        indicator.classList.add("hidden");
    };

    recognition.onend = function () {
        indicator.classList.add("hidden");
    };
}


// ======================
// STT - 검색
// ======================

function simulateSearchSTT() {

    const indicator = document.getElementById("search-voice-indicator");

    if (!('webkitSpeechRecognition' in window)) {
        alert("이 브라우저는 음성인식을 지원하지 않습니다.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;

    indicator.classList.remove("hidden");
    recognition.start();

    recognition.onresult = function (event) {
        const text = event.results[0][0].transcript;
        document.getElementById("easy-search-query").value = text;
        executeEasySearch();
    };

    recognition.onerror = function (event) {
        console.error("STT 오류:", event.error);
        alert("음성 인식에 실패했습니다.");
        indicator.classList.add("hidden");
    };

    recognition.onend = function () {
        indicator.classList.add("hidden");
    };
}


// ======================
// STT - 루틴
// ======================

function simulateRoutineSTT() {

    const indicator = document.getElementById("routine-voice-indicator");

    if (!('webkitSpeechRecognition' in window)) {
        alert("이 브라우저는 음성인식을 지원하지 않습니다.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;

    indicator.classList.remove("hidden");
    recognition.start();

    recognition.onresult = function (event) {
        const text = event.results[0][0].transcript;
        document.getElementById("new-routine-text").value = text;
        addRoutine();
    };

    recognition.onerror = function (event) {
        console.error("STT 오류:", event.error);
        alert("음성 인식에 실패했습니다.");
        indicator.classList.add("hidden");
    };

    recognition.onend = function () {
        indicator.classList.add("hidden");
    };
}


// ======================
// STT - 약 알림
// ======================

function simulateMedicationSTT(field) {

    const indicator = document.getElementById("med-voice-indicator");

    if (!('webkitSpeechRecognition' in window)) {
        alert("이 브라우저는 음성인식을 지원하지 않습니다.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;

    indicator.classList.remove("hidden");
    recognition.start();

    recognition.onresult = function (event) {
        const text = event.results[0][0].transcript;
        if (field === "name") {
            document.getElementById("med-name").value = text;
        }
        // time 필드는 time input이라 음성으로 직접 입력 어려우므로 이름만 처리
    };

    recognition.onerror = function (event) {
        console.error("STT 오류:", event.error);
        alert("음성 인식에 실패했습니다.");
        indicator.classList.add("hidden");
    };

    recognition.onend = function () {
        indicator.classList.add("hidden");
    };
}


console.log("script.js 로드 완료");