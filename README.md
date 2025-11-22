# 🧮 Automata Visualizer & Converter

A **web-based educational tool** for visualizing, testing, and converting **finite automata** — including **NFAs**, **DFAs**, and **DAFSAs** — built entirely with **plain JavaScript** and **vis-network**.

This project demonstrates the practical application of core **Automata Theory** algorithms:
- Subset construction (NFA → DFA conversion)
- DAFSA minimization and DAFSA building from finite languages

---

## 🚀 Features

### 🧩 NFA → DFA Converter
- Upload an **NFA** definition as `.json` or `.txt` in JSON format.  
- Automatically **convert to an equivalent DFA** using the subset-construction algorithm.  
- **Visualize** both NFAs and DFAs with labeled transitions and accept states.  
- **Test strings** for acceptance based on the automaton’s language.  

### 🔤 DAFSA Builder & Minimizer
- Upload a **finite language** as `.json` or `.txt` in JSON format.  
- **Construct its corresponding deterministic acyclic finite-state automaton (DAFSA).**  
- Apply **state minimization** to merge equivalent suffix states.  
- Validate strings for membership in the represented language.  

### ℹ️ FSM Applications
- Learn more about FSMs through the explanation of 2 practical applications

### 💡 General Features
- Clean, consistent interface across tools.  
- Interactive graph visualization powered by **vis-network**.  
- No external dependencies beyond the browser (fully client-side).  
- Perfect for **Automata Theory Visualization**.

---

## 🧱 Project Structure

```bash
Machine Tinkerer/
│
├── CSS/
│ ├── DAFSA.css # Styling for DAFSA Builder & Minimizer
│ └── NFAtoDFA.css # Styling for NFA→DFA Converter
│ └── FSM_Applications.css # Styling for FSM_Applications
│
├── icons/
│ ├── DAFSA.ico # Favicon for DAFSA page
│ └── NFAtoDFA.ico # Favicon for NFA→DFA page
│ └── node.png # Favicon for FSM_Applications page
│
├── JS/
│ ├── DAFSA.js # Logic for DAFSA building, minimization, and validation
│ └── NFAtoDFA.js # Logic for NFA→DFA visualization, conversion, and string testing
│
├── DAFSA.html # DAFSA Builder & Minimizer HTML structure
├── NFAtoDFA.html # NFA→DFA Converter HTML structure
├── FSM_Applications.html # FSM Applications page (static read-only)
│
├── ExampleLanguage.json # Example input: finite language definition for DAFSA building
├── ExampleNFA.json # Example input: NFA definition for NFA→DFA conversion
│
└── README.md # Project documentation and usage guide (this file)
```

## 🧾 Input Formats

### NFA Example (`ExampleNFA.json`)
```json
{
    "states": [
        "q1",
        "q2"
    ],
    "alphabet": [
        "a",
        "b"
    ],
    "start": "q1",
    "accept": [
        "q2"
    ],
    "transitions": {
        "q1": {
            "a": [
                "q1",
                "q2"
            ],
            "b": [
                "q1"
            ]
        },
        "q2": {
            "b": [
                "q1"
            ]
        }
    }
}
```

### Language Example (ExampleLanguage.json)
```json
{
    "alphabet": ["a", "b"],
    "accept": ["", "a", "ab", "aabb"]
}
```

## 🧠 Algorithms Used
- **NFA→DFA conversion:** Subset Construction Algorithm was used to convert a nondeterministic finite automaton (NFA) into its equivalent deterministic form (DFA) by treating each DFA state as a subset of NFA states.

- **DAFSA Minimization:** Builds a deterministic acyclic automaton (DAFSA) from a finite language and merges suffix-equivalent states to minimize the structure (bottom-up approach).

## ⚙️ How to Run

1. **Clone the repository:**
```bash
git clone https://github.com/ManarMerhiMM/FSM-Tinkerer.git
cd FSM-Tinkerer
```

2. **Open either** `NFAtoDFA.html` **or** `DAFSA.html` **or** `FSM_Applications.html` **directly in your browser.**

3. **Upload your automaton or language definition or simply view the 2 FSM applications.**

4. **Explore:**
   - Convert **NFA → DFA**
   - Build and minimize **DAFSA**
   - View FSM Applications for information
   - Test strings for acceptance

## 📚 Educational Context

This project implements **Exercises 1, 2, & 3** from the `Theory of Computation` Project at `RHU University`; `Fall 2025-2026`, focusing on:

- Construction of **NFAs from Machine Definition**
- Construction of **DFAs from NFAs**
- **DAFSA Construction from Language Definition** and **height minimization of DAFSAs**
- Visual representation of **state transitions** and **accept states**
- FSM Applications (2 examples)

It serves as a hands-on educational tool for understanding **deterministic** and **non-deterministic** automata, as well as their practical equivalence.

## 👩‍💻 Technologies

- **HTML5**
- **CSS3**
- **JavaScript (ES6)**
- **vis-network** (for graph visualization)

---

## 🧾 License

This project is open-source and available to download and use freely for everyone!
You may freely fork, modify, and use it for educational or research purposes.

---

**Authors:** *Manar Merhi, Malek Shibli, Hadi Wehbi, and Mohammad El Halabi*

