function saveDiary() {
    let date = document.getElementById("date").value;
    let title = document.getElementById("title").value;
    let content = document.getElementById("content").value;

    let entry = {
        date: date,
        title: title,
        content: content
    };

    let diary = JSON.parse(localStorage.getItem("diaryEntries")) || [];
    diary.push(entry);
    localStorage.setItem("diaryEntries", JSON.stringify(diary));

    alert("Diary Entry Saved!");
}

function loadEntries() {
    let diary = JSON.parse(localStorage.getItem("diaryEntries")) || [];
    let entriesDiv = document.getElementById("entriesList");

    entriesDiv.innerHTML = "";

    diary.forEach((entry, index) => {
        entriesDiv.innerHTML += `
            <div style="border:1px solid gray; padding:10px; margin:10px;">
                <h3>${entry.title}</h3>
                <small>${entry.date}</small>
                <p>${entry.content}</p>
                <button onclick="deleteEntry(${index})">Delete</button>
            </div>
        `;
    });
}

function deleteEntry(index) {
    let diary = JSON.parse(localStorage.getItem("diaryEntries")) || [];
    diary.splice(index, 1);
    localStorage.setItem("diaryEntries", JSON.stringify(diary));
    loadEntries();
}

if (window.location.pathname.includes("entries.html")) {
    loadEntries();
}