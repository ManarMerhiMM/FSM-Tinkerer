/* Plain-JS automaton viewer & tester (vis-network UMD)
   - Start with NO machine rendered; controls disabled until a file is loaded
   - Two tools + 1 action:
       • Upload Automaton (.txt/.json, but JSON-formatted)
       • Test String (auto-reject if symbol not in alphabet)
       • Convert NFA → DFA
   - Visuals: accept = green border; non-accept = red border
*/

// State 
let automaton = null;         // current displayed automaton (NFA or DFA)
let originalNFA = null;       // hold original upload in case you want to reconvert
let network = null;           // vis network
const container = document.getElementById("graph");

// UI Helpers
const loadBtn = document.getElementById("loadBtn");
const convertBtn = document.getElementById("convertBtn");
const testBtn = document.getElementById("testBtn");
const testInput = document.getElementById("testInput");
const fileInput = document.getElementById("automatonFile");
const testResult = document.getElementById("testResult");

function setLoadedUI(enabled) {
    convertBtn.disabled = !enabled;
    testBtn.disabled = !enabled;
    testInput.disabled = !enabled;
    if (!enabled) {
        testResult.textContent = "No automaton loaded.";
        testResult.classList.add("muted");
        testResult.style.color = "";
    } else {
        testResult.textContent = "Automaton loaded ✔";
        testResult.classList.remove("muted");
        testResult.style.color = "#2e7d32";
        setTimeout(() => {
            testResult.textContent = "";
            testResult.style.color = "";
        }, 1200);
    }
}

// Graph rendering
function buildNodes(a) {
    const arr = a.states.map((s) => {
        const isAccept = (a.accept || []).includes(s);
        return {
            id: s,
            label: s,
            shape: "circle",
            borderWidth: 2,
            color: {
                background: "#ffffff",
                border: isAccept ? "#2e7d32" : "#b63b3b"
            },
            font: { face: "Inter, system-ui, sans-serif", size: 14 }
        };
    });

    if (a.start) {
        arr.push({
            id: "__start",
            label: "",
            shape: "dot",
            size: 5,
            color: { background: "#aaaaaa", border: "#666" },
            physics: true,
            hidden: false
        });
    }

    return new vis.DataSet(arr);
}

function buildEdges(a) {
    const grouped = new Map(); // "from→to" => {from,to,symbols[], self}

    Object.keys(a.transitions || {}).forEach((from) => {
        const bySym = a.transitions[from] || {};
        Object.keys(bySym).forEach((sym) => {
            (bySym[sym] || []).forEach((to) => {
                const k = `${from}→${to}`;
                if (!grouped.has(k)) grouped.set(k, { from, to, symbols: [], self: from === to });
                grouped.get(k).symbols.push(sym);
            });
        });
    });

    const arr = [];
    for (const e of grouped.values()) {
        const isSelf = e.self;
        let smooth, length;
        if (isSelf) {
            smooth = { enabled: true, type: "curvedCW", roundness: 0.72 };
            length = 90;
        } else {
            const forward = e.from < e.to;
            smooth = {
                enabled: true,
                type: forward ? "curvedCW" : "curvedCCW",
                roundness: forward ? 0.62 : 0.12,
                forceDirection: "horizontal"
            };
            length = forward ? 260 : 210;
        }

        arr.push({
            from: e.from,
            to: e.to,
            label: e.symbols.join(", "),
            arrows: { to: { enabled: true, type: "arrow", scaleFactor: 0.7 } },
            arrowStrikethrough: false,
            smooth,
            length,
            color: { color: "#000000" },
            font: { align: "top" },
            width: 1.4
        });
    }

    if (a.start) {
        arr.push({
            from: "__start",
            to: a.start,
            arrows: { to: { enabled: true, type: "arrow", scaleFactor: 0.75 } },
            color: { color: "#555" },
            width: 1.2,
            label: "start",
            font: { vadjust: -6, ital: true },
            smooth: { enabled: true, type: "curvedCCW", roundness: 0.45 },
            length: 200
        });
    }

    return new vis.DataSet(arr);
}

const networkOptions = {
    interaction: { hover: false, keyboard: false, selectable: false },
    nodes: { chosen: false },
    edges: {
        chosen: false,
        arrows: { to: { enabled: true, type: "arrow", scaleFactor: 0.7 } },
        arrowStrikethrough: false,
        color: { color: "#000000" },
        smooth: { enabled: true }
    },
    physics: {
        enabled: true,
        solver: "repulsion",
        repulsion: {
            nodeDistance: 300,
            springLength: 230,
            damping: 0.55
        }
    }
};

function renderAutomaton(a) {
    const nodes = buildNodes(a);
    const edges = buildEdges(a);
    if (!network) {
        network = new vis.Network(container, { nodes, edges }, networkOptions);
    } else {
        network.setData({ nodes, edges });
    }
}

// Testing (NFA)
function accepts(a, inputStr) {
    // Reject if any symbol not in alphabet
    const alpha = new Set(a.alphabet || []);
    for (const ch of inputStr) {
        if (!alpha.has(ch)) return { accepted: false, reason: `Symbol '${ch}' not in alphabet` };
    }
    if (!a.start) return { accepted: false, reason: "No start state" };

    // current set of states (NFA)
    let current = new Set([a.start]);

    for (const ch of inputStr) {
        const next = new Set();
        for (const s of current) {
            const moves = (((a.transitions || {})[s] || {})[ch]) || [];
            for (const t of moves) next.add(t);
        }
        current = next;
        if (current.size === 0) return { accepted: false, reason: "Dead configuration" };
    }

    const acceptSet = new Set(a.accept || []);
    const ok = [...current].some((s) => acceptSet.has(s));
    return { accepted: ok, reason: ok ? "Reached an accept state" : "No accept state reached" };
}

// NFA → DFA
function nfaToDfa(nfa) {
    const alphabet = nfa.alphabet || [];
    const startSet = new Set([nfa.start]);

    const keyOf = (set) => {
        const arr = [...set];
        arr.sort();
        return arr.join(","); // "" represents empty set (we won't add it as a state)
    };

    const statesMap = new Map(); // key -> Set
    const stack = [];
    const startKey = keyOf(startSet);
    statesMap.set(startKey, startSet);
    stack.push(startSet);

    const dfaTransitions = {};
    const dfaAccept = new Set();

    while (stack.length) {
        const S = stack.pop();
        const Skey = keyOf(S);
        dfaTransitions[Skey] = dfaTransitions[Skey] || {};

        for (const sym of alphabet) {
            const T = new Set();
            for (const q of S) {
                const moves = (((nfa.transitions || {})[q] || {})[sym]) || [];
                for (const t of moves) T.add(t);
            }
            const Tkey = keyOf(T);
            // In DFA, each transition has exactly 1 target state
            dfaTransitions[Skey][sym] = T.size ? [Tkey] : [];

            if (T.size && !statesMap.has(Tkey)) {
                statesMap.set(Tkey, T);
                stack.push(T);
            }
        }
    }

    // Accepting DFA states: any subset that intersects NFA accepts
    const nfaAccept = new Set(nfa.accept || []);
    for (const [k, set] of statesMap.entries()) {
        if ([...set].some((s) => nfaAccept.has(s))) dfaAccept.add(k);
    }

    return {
        states: [...statesMap.keys()],
        alphabet: [...alphabet],
        start: startKey,
        accept: [...dfaAccept],
        transitions: dfaTransitions
    };
}

// File loader 
loadBtn?.addEventListener("click", async () => {
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        alert("Please choose a .txt/.json file that contains the automaton JSON.");
        return;
    }
    try {
        const text = await fileInput.files[0].text();
        const obj = JSON.parse(text);

        const required = ["states", "alphabet", "start", "accept", "transitions"];
        for (const k of required) {
            if (!(k in obj)) throw new Error(`Missing key '${k}'`);
        }
        if (!Array.isArray(obj.states) || !Array.isArray(obj.alphabet) || !Array.isArray(obj.accept))
            throw new Error("states, alphabet, and accept must be arrays");
        if ("epsilon" in obj) throw new Error("Epsilon transitions are not supported.");

        automaton = obj;
        originalNFA = JSON.parse(JSON.stringify(obj)); // deep copy
        renderAutomaton(automaton);
        setLoadedUI(true);
    } catch (err) {
        console.error(err);
        alert("Failed to load automaton: " + err.message);
        setLoadedUI(false);
    }
});

// Convert NFA → DFA Listener
convertBtn?.addEventListener("click", () => {
    if (!automaton) return;
    try {
        const dfa = nfaToDfa(automaton);
        automaton = dfa;
        renderAutomaton(automaton);
        testResult.textContent = "Converted to DFA ✔";
        testResult.style.color = "#2e7d32";
        setTimeout(() => (testResult.textContent = ""), 1200);
    } catch (e) {
        alert("Conversion failed: " + e.message);
    }
});

// String tester Listener 
testBtn?.addEventListener("click", () => {
    if (!automaton) return;
    const s = (testInput.value || "").trim();
    const { accepted, reason } = accepts(automaton, s);
    testResult.textContent = accepted ? `ACCEPT ✅ — ${reason}` : `REJECT ❌ — ${reason}`;
    testResult.style.color = accepted ? "#2e7d32" : "#b63b3b";
});
