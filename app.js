// ==== API Keys ====
const openaiApiKey = window.APP_CONFIG.OPENAI_API_KEY;
const semanticScholarApiKey = window.APP_CONFIG.SEMANTIC_SCHOLAR_API_KEY;

let noteCache = [];
let ttsAudio = null;

// ==== Utility Functions ====

/**
 * Formats a paper's bibliographic information into a full APA style reference.
 * Handles journal names that might be objects.
 * @param {object} paper - The paper object from Semantic Scholar.
 * @returns {string} The full APA formatted reference string.
 */
function formatAPA(paper) {
  const authors = paper.authors.map(a => a.name).join(', ');
  let journalName = 'Journal Name'; // Default fallback
  if (paper.journal) {
    if (typeof paper.journal === 'string') {
      journalName = paper.journal;
    } else if (typeof paper.journal === 'object' && paper.journal.name) {
      journalName = paper.journal.name;
    }
  }
  return `${authors} (${paper.year}). ${paper.title}. ${journalName}, Retrieved from ${paper.url}`;
}

/**
 * Formats a list of authors for an APA in-text citation.
 * Applies "et al." rules for 3+ authors.
 * @param {Array<object>} authorsArray - An array of author objects ({name: "..."}).
 * @returns {string} The formatted author string for in-text citation.
 */
function formatInTextCitationAuthors(authorsArray) {
  if (!authorsArray || authorsArray.length === 0) {
    return "Anonymous";
  }
  const lastNames = authorsArray.map(a => a.name.split(' ').pop()); // Get last names

  if (lastNames.length === 1) {
    return lastNames[0];
  } else if (lastNames.length === 2) {
    return `${lastNames[0]} & ${lastNames[1]}`;
  } else {
    // For 3 or more authors, APA style uses et al.
    return `${lastNames[0]} et al.`;
  }
}

async function callOpenAI(prompt, resultElement) {
  resultElement.textContent = '🧠 Thinking...';
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.7
      })
    });
    const data = await response.json();
    if (data.choices && data.choices[0]) {
      resultElement.textContent = data.choices[0].message.content;
    } else {
      resultElement.textContent = "⚠️ No response from OpenAI.";
    }
  } catch (error) {
    resultElement.textContent = "⚠️ Error calling OpenAI.";
    console.error(error);
  }
}

async function playTextWithOpenAITTS(text, voice = "alloy") {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey}`
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: voice,
      input: text
    })
  });
  const arrayBuffer = await response.arrayBuffer();
  if (ttsAudio) ttsAudio.pause();
  ttsAudio = new Audio(URL.createObjectURL(new Blob([arrayBuffer])));
  ttsAudio.play();
}

function makeDraggable(popup) {
  let isDragging = false;
  let offsetX, offsetY;

  popup.addEventListener("mousedown", (e) => {
    if (e.target.tagName !== "H3") return;
    isDragging = true;
    offsetX = e.clientX - popup.getBoundingClientRect().left;
    offsetY = e.clientY - popup.getBoundingClientRect().top;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    popup.style.left = `${e.clientX - offsetX}px`;
    popup.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
}
async function fetchGlossaryDefinitions(term) {
  const prompt = `
You are a bilingual glossary generator for academic English.

1. Define this term in simple, clear English.
2. Then explain its meaning specifically in the context of social science or thesis writing, if relevant.
3. Finally, give a short Japanese translation (not translation of the explanation—just the equivalent meaning in Japanese).

TERM: "${term}"

Respond in this format:

Definition: [English explanation]
Contextual Meaning: [Field-specific clarification]
Japanese: [Japanese equivalent]
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse response
    const enMatch = content.match(/Definition:\s*(.+)/i);
    const jpMatch = content.match(/Japanese:\s*(.+)/i);

    document.getElementById("glossaryEnglish").textContent = enMatch?.[1]?.trim() || "No definition.";
    document.getElementById("glossaryJapanese").textContent = jpMatch?.[1]?.trim() || "日本語訳なし";

  } catch (err) {
    console.error("Glossary fetch error:", err);
    document.getElementById("glossaryEnglish").textContent = "Error fetching definition.";
    document.getElementById("glossaryJapanese").textContent = "エラー";
  }
}
// ==== Main Setup ====
document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("sendGeneralChat").onclick = () => {
    const userMessage = document.getElementById("generalChat").value.trim();
    if (!userMessage) return alert("Please enter your request.");

    const prompt = `You are an academic writing expert helping a student improve their writing or argumentation.

Here is the user's request or question:
"${userMessage}"

Provide a clear, structured, academic explanation or advice. If applicable, include writing examples, citation suggestions, or conceptual clarification.`;

    callOpenAI(prompt, document.getElementById("generalChatResult"));
  };

  makeDraggable(document.getElementById("glossaryPopup"));

  document.getElementById("analyzeIntroduction").onclick = () => {
    const intro = document.getElementById("introduction").value.trim();
    if (!intro) return alert("Please paste your introduction.");
    const prompt = `Please analyze the following thesis introduction for:\n1. Clarity and coherence\n2. Strength of academic structure\n3. Suggestions for improvement\n\nThen, suggest related topics and subtopics in an itemized format like:\n1. [Topic Title]\n   - Subtopic A\n   - Subtopic B\n2. [Another Topic Title]\n   - Subtopic A\n   - Subtopic B\n\nHere is the introduction:\n"${intro}"`;
    callOpenAI(prompt, document.getElementById("analyzeIntroductionResult"));
  };

  document.getElementById("refineIdeas").onclick = async () => {
    const topic = document.getElementById("authorInput").value.trim();
    const box = document.getElementById("authorSuggestions");
    const studyBox = document.getElementById("authorStudiesBox");
    if (!topic) return alert("Please enter a topic.");
    studyBox.textContent = '🔎 Now fetching studies...';
    if (studyCache[topic]) {
      renderStudies(studyCache[topic], studyBox);
      generateNote(topic, studyCache[topic], box);
    } else {
      const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(topic)}&limit=3&fields=title,authors,year,url,abstract,journal`;
      try {
        const response = await fetch(url, {
          headers: semanticScholarApiKey ? { "x-api-key": semanticScholarApiKey } : {}
        });
        const data = await response.json();
        if (data.data) {
          studyCache[topic] = data.data;
          renderStudies(data.data, studyBox);
          generateNote(topic, data.data, box);
        } else {
          studyBox.textContent = "No studies found.";
        }
      } catch (err) {
        studyBox.textContent = "Error fetching studies.";
        console.error(err);
      }
    }
  };

  function generateNote(topic, papers, box) {
    const formattedStudies = papers.map(formatAPA).join("\n");
    
    let numberedStudiesPrompt = [];
    let suggestedSentenceInTextCitations = [];

    papers.forEach((p, i) => {
        numberedStudiesPrompt.push(`${i + 1}. ${formatAPA(p)}`);
        suggestedSentenceInTextCitations.push(`${formatInTextCitationAuthors(p.authors)} (${p.year})`);
    });
    
    const inTextCitationsExample = suggestedSentenceInTextCitations.join(" and ");

    const prompt = `You are an academic writing assistant.\n\nHere is a topic: "${topic}"\nAnd these are real academic studies related to it:\n${formattedStudies}\n\nWrite a note that includes:\n🔹 Topic: ${topic}\n📚 Study: (LIST THESE STUDIES EXACTLY AS PROVIDED BELOW, DO NOT REPHRASE OR ALTER, ENSURE EACH IS NUMBERED AND ON A NEW LINE)\n${numberedStudiesPrompt.join('\n')}\n📝 Suggested sentence: [A sample sentence showing how these studies could be used in academic writing, using in-text citations like: "${inTextCitationsExample}". IMPORTANT: Ensure all in-text citations follow APA format: "Lastname (Year)" for one author, "Lastname & Lastname (Year)" for two authors, "Lastname et al. (Year)" for three or more authors. ALWAYS include the year in parentheses after the authors for in-text citations.]\n\nDo not invent any sources. Only use what is listed.`;
    box.textContent = '📝 Generating writing suggestion...';
    callOpenAI(prompt, box);
  }


  document.getElementById("generateFullSection").onclick = () => {
    const intro = document.getElementById("introduction").value.trim();
    const notes = Array.from(document.getElementById("notesList").children).map(li => li.textContent).join("\n\n");
    const prompt = `You are an academic writing assistant.\n\nWrite a cohesive academic section titled \"Previous Studies and Related Topics\" for a student's thesis.\n\nStart from the student's research theme and introduction:\n\"${intro}\"\n\nThen, integrate the following real research notes collected by the student.\n\nEach note includes:\n- A topic\n- A real study (APA format)\n- A suggestion for how the study might support the paper\n\nYour task:\n1. Write as if you are the student.\n2. Use formal academic style and structure.\n3. Integrate the studies naturally — not just list them.\n4. Show how they support the purpose of the current study.\n5. Do not invent any additional sources or assumptions.\n\nHere are the notes:\n${notes}\n\nWrite the entire section in a unified paragraph flow.`;
    
    // Call OpenAI to generate the section. Use .then() to ensure updateReferencesFromNotes runs AFTER the AI response.
    callOpenAI(prompt, document.getElementById("suggestedFullSection")).then(() => {
      updateReferencesFromNotes();
    });
  };


  document.querySelectorAll("#addNote").forEach(btn => {
    btn.onclick = () => {
      const text = btn.previousElementSibling?.textContent.trim();
      if (text) {
        const li = document.createElement("li");
        li.textContent = text;
        document.getElementById("notesList").appendChild(li);
      } else {
        alert("No content to save as note.");
      }
    };
  });

  function setupGlossary() {
    document.querySelectorAll(".whatDoesItMean").forEach(btn => {
      btn.onclick = () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        if (!selectedText) return alert("Please highlight a word or phrase first.");

        const popup = document.getElementById("glossaryPopup");
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        popup.style.left = `${rect.left + window.scrollX}px`;
        popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
        popup.style.display = "block";

        document.getElementById("glossaryTerm").textContent = selectedText;
        fetchGlossaryDefinitions(selectedText);
      };
    });
  }
  setupGlossary();

  document.getElementById("closeGlossary").onclick = () => {
    document.getElementById("glossaryPopup").style.display = "none";
  };

  document.getElementById("playIt").onclick = () => {
    const text = document.getElementById("glossaryTerm").textContent;
    if (!text) return alert("No term to read.");
    playTextWithOpenAITTS(text);
  };

  document.getElementById("addToGlossary").onclick = () => {
  const term = document.getElementById("glossaryTerm").textContent;
  const meaning = document.getElementById("glossaryEnglish").textContent;
  const japanese = document.getElementById("glossaryJapanese").textContent;

  const li = document.createElement("li");
  li.innerHTML = `<strong>${term}</strong><br>
  <em>${meaning}</em><br>
  <span>${japanese}</span>`;

  document.getElementById("glossaryList").appendChild(li);
};

  document.getElementById("copyToClipboard").onclick = () => {
    const text = `Phrase: ${document.getElementById("glossaryTerm").textContent}
Meaning (EN): ${document.getElementById("glossaryEnglish").textContent}
Meaning (JP): ${document.getElementById("glossaryJapanese").textContent}`;
    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
  };

  // Add the event listener for the "Save My Work" button
  document.getElementById("saveWork").onclick = downloadHTMLFile;

}); // End of DOMContentLoaded

function downloadHTMLFile() {
  const intro = document.getElementById("introduction").value.trim();
  const fullSection = document.getElementById("suggestedFullSection").textContent.trim();

  const glossaryHTML = Array.from(document.querySelectorAll("#glossaryList li"))
    .map(li => `<li>${li.innerHTML}</li>`).join('\n');

  const referencesHTML = Array.from(document.querySelectorAll("#referencesList li"))
    .map(li => li.outerHTML).join('\n');

  const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\">
  <title>Saved Thesis Work</title>
  <style>
    body { font-family: serif; line-height: 1.6; margin: 40px; }
    h1, h2 { color: #003366; }
    section { margin-bottom: 40px; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <h1>Thesis Writing Output</h1>
  <section><h2>📄 Introduction</h2><p>${intro}</p></section>
  <section><h2>📚 Previous Studies and Related Topics</h2><p>${fullSection}</p></section>
  <section><h2>📖 References (APA)</h2><ul>${referencesHTML}</ul></section>
  <section><h2>📘 Glossary</h2><ul>${glossaryHTML}</ul></section>
</body>
</html>`;

  const blob = new Blob([content], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "thesis_work.html";
  a.click();
  URL.revokeObjectURL(url);
}
function renderStudies(studies, container) {
  container.innerHTML = studies.map(paper => `
    <div class='paper-suggestion'>
      <h4><a href=\"${paper.url}\" target=\"_blank\">${paper.title}</a></h4>
      <p><strong>Authors:</strong> ${paper.authors.map(a => a.name).join(', ')}</p>
      <p><strong>Year:</strong> ${paper.year}</p>
      <p>${paper.abstract ? paper.abstract.slice(0, 200) + '...' : 'No abstract available.'}</p>
    </div>
  `).join('');
}

/**
 * Extracts APA-formatted references from the Personal Notes list.
 * This is a more reliable approach since notes are expected to contain the full APA strings.
 */
function updateReferencesFromNotes() {
  const notesList = document.getElementById("notesList");
  const referencesList = document.getElementById("referencesList");
  referencesList.innerHTML = ''; // Clear existing references

  const uniqueReferences = new Set();

  // Regex to broadly capture each numbered APA line within the note content.
  // This first stage extracts lines that look like: "X. Authors (Year). Title. Journal, Retrieved from URL"
  const rawApaLineRegex = /\d+\.\s*([A-Za-z\s.,&'\-—–—-]+?)\s*\(\s*(\d{4})\s*\)\.\s*([^.]+?)\.\s*([^,]+?)(?:,\s*(?:Retrieved from|Available from)?)?\s*(https?:\/\/[^\s]+)/g;

  Array.from(notesList.children).forEach(noteItem => {
    const noteText = noteItem.textContent;
    console.log("Processing noteText:\n", noteText); // DEBUG: Logs the exact text of each note for inspection

    let match;
    // Reset lastIndex for the regex for each new string processed
    rawApaLineRegex.lastIndex = 0; 
    while ((match = rawApaLineRegex.exec(noteText)) !== null) {
        // Reconstruct the full APA string from captured groups, trimming whitespace
        // Group 4 (Journal/Source) might contain extra commas or "Retrieved from" if the optional part matched nothing.
        const authors = match[1].trim();
        const year = match[2];
        const title = match[3].trim();
        const journalPart = match[4].trim().replace(/,\s*$/, ''); // Remove trailing comma if present
        const url = match[5];

        const fullReference = `${authors} (${year}). ${title}. ${journalPart}, Retrieved from ${url}`;
        uniqueReferences.add(fullReference);
        console.log("Found APA match:", fullReference); // DEBUG: Logs successfully found APA references
    }
  });

  if (uniqueReferences.size === 0) {
      console.warn("No APA references found in notes. Ensure notes contain numbered APA lines."); // DEBUG: Warns if no references are found
  }

  uniqueReferences.forEach(ref => {
    const li = document.createElement("li");
    li.textContent = ref;
    referencesList.appendChild(li);
  });
}