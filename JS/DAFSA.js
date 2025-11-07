// DAFSA Builder & Minimizer (Plain JS + vis-network)


let currentDFA = null;        // DAFSA currently rendered
let originalDFA = null;       // un-minimized DFA built from the language
let network = null;

const el = (id) => document.getElementById(id);
const fileInput = el("languageFile");
const loadBtn = el("loadLangBtn");
const minimizeBtn = el("minimizeBtn");
const testInput = el("testInput");
const testBtn = el("testBtn");
const testResult = el("testResult");
const graphDiv = el("graph");

/* Utilities  */
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function setControlsEnabled(enabled) {
    minimizeBtn.disabled = !enabled;
    testBtn.disabled = !enabled;
    testInput.disabled = !enabled;
}

/*  Build DFA from a finite language (Trie) */
function buildTrieDFA(language) {
    const { alphabet, accept } = language;

    assert(Array.isArray(alphabet) && alphabet.length > 0, "alphabet must be a non-empty array");
    assert(Array.isArray(accept), "accept must be an array of strings");

    const alpha = new Set(alphabet);

    // Validate every string uses only symbols from the alphabet
    for (const w of accept) {
        assert(typeof w === "string", "accept contains a non-string");
        for (const ch of w) {
            assert(alpha.has(ch), `string "${w}" contains symbol "${ch}" not in alphabet`);
        }
    }

    // Node ids
    let nextId = 0;
    const newId = () => `q${nextId++}`;

    // Trie nodes: { id, edges: Map(symbol -> childId), final: bool }
    const nodes = new Map();
    function ensureNode(id) {
        if (!nodes.has(id)) nodes.set(id, { id, edges: new Map(), final: false });
        return nodes.get(id);
    }
    const start = newId();
    ensureNode(start);

    // Insert words
    for (const w of accept) {
        let v = start;
        for (const ch of w) {
            const node = ensureNode(v);
            const next = node.edges.get(ch) || newId();
            if (!node.edges.has(ch)) node.edges.set(ch, next);
            v = next;
            ensureNode(v);
        }
        nodes.get(v).final = true;
    }

    // Convert to DFA JSON
    const dfa = {
        alphabet: [...alpha],
        states: [...nodes.keys()],
        start,
        accept: [...[...nodes.values()].filter(n => n.final).map(n => n.id)],
        transitions: {}
    };
    for (const n of nodes.values()) {
        dfa.transitions[n.id] = {};
        for (const [sym, to] of n.edges.entries()) {
            dfa.transitions[n.id][sym] = [to]; // deterministic
        }
    }
    return dfa;
}

/*  Minimize acyclic DFA into DAFSA (bottom-up merging)
   For finite languages (acyclic DFA), two states are equivalent iff their
   "right languages" are identical. We can canonicalize subtrees:
   signature(state) = final? + sorted list of (symbol, signature(child)).
   Identical signatures are merged.
*/
function minimizeAcyclicDFA(dfa) {
    // Build adjacency and compute signature by memoized DFS
    const transitions = dfa.transitions || {};
    const memo = new Map();       // stateId -> signature string
    const rep = new Map();        // signature -> representative stateId

    function sig(s) {
        if (memo.has(s)) return memo.get(s);
        const edges = transitions[s] || {};
        const parts = [];
        // sort by symbol to make signature stable
        const syms = Object.keys(edges).sort();
        for (const a of syms) {
            const dest = edges[a]?.[0];
            parts.push(a + ">" + sig(dest));
        }
        const isFinal = dfa.accept.includes(s) ? "1" : "0";
        const signature = isFinal + "|" + parts.join(",");
        memo.set(s, signature);
        return signature;
    }

    // Compute all signatures
    dfa.states.forEach(sig);

    // Map each old state to canonical representative
    const mapToRep = new Map(); // old -> new (rep id)
    for (const s of dfa.states) {
        const signature = memo.get(s);
        if (!rep.has(signature)) rep.set(signature, s);
        mapToRep.set(s, rep.get(signature));
    }

    // Build minimized DFA
    const newStatesSet = new Set([...rep.values()]);
    const newStart = mapToRep.get(dfa.start);
    const newAccept = [...newStatesSet].filter(s => dfa.accept.includes(s));

    const newTransitions = {};
    for (const s of newStatesSet) {
        newTransitions[s] = {};
        const edges = dfa.transitions[s] || {};
        for (const a of Object.keys(edges)) {
            const dstOld = edges[a][0];
            newTransitions[s][a] = [mapToRep.get(dstOld)];
        }
    }

    return {
        alphabet: [...dfa.alphabet],
        states: [...newStatesSet],
        start: newStart,
        accept: newAccept,
        transitions: newTransitions
    };
}

/* Test membership  */
function accepts(dfa, inputStr) {
    const alpha = new Set(dfa.alphabet || []);
    for (const ch of inputStr) {
        if (!alpha.has(ch)) return { accepted: false, reason: `Symbol '${ch}' not in alphabet` };
    }
    let s = dfa.start;
    for (const ch of inputStr) {
        const next = (dfa.transitions[s] || {})[ch];
        if (!next || next.length === 0) return { accepted: false, reason: "No transition" };
        s = next[0];
    }
    const ok = dfa.accept.includes(s);
    return { accepted: ok, reason: ok ? "Reached an accept state" : "Stopped in non-accepting state" };
}

/*  Graph rendering (vis-network)  */
function buildNodes(dfa) {
    const arr = dfa.states.map((s) => {
        const isAccept = dfa.accept.includes(s);
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

    // movable small start node
    if (dfa.start) {
        arr.push({
            id: "__start",
            label: "",
            shape: "dot",
            size: 5,
            color: { background: "#aaaaaa", border: "#666" },
            physics: true
        });
    }
    return new vis.DataSet(arr);
}

function buildEdges(dfa) {
    // combine same (from->to) with multiple symbols into one labeled edge
    const grouped = new Map(); // key "from->to" -> symbols[]
    Object.keys(dfa.transitions || {}).forEach((from) => {
        const bySym = dfa.transitions[from] || {};
        Object.keys(bySym).forEach((sym) => {
            const to = bySym[sym]?.[0];
            const key = `${from}→${to}`;
            if (!grouped.has(key)) grouped.set(key, { from, to, symbols: [] });
            grouped.get(key).symbols.push(sym);
        });
    });

    const arr = [];
    for (const e of grouped.values()) {
        const forward = e.from < e.to;
        arr.push({
            from: e.from,
            to: e.to,
            label: e.symbols.sort().join(", "),
            arrows: { to: { enabled: true, type: "arrow", scaleFactor: 0.7 } },
            arrowStrikethrough: false,
            smooth: {
                enabled: true,
                type: forward ? "curvedCW" : "curvedCCW",
                roundness: forward ? 0.35 : 0.25,
                forceDirection: "horizontal"
            },
            color: { color: "#000000" },
            font: { align: "top" },
            width: 1.4
        });
    }

    if (dfa.start) {
        arr.push({
            from: "__start",
            to: dfa.start,
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

function renderDFA(dfa) {
    const nodes = buildNodes(dfa);
    const edges = buildEdges(dfa);
    if (!network) {
        network = new vis.Network(graphDiv, { nodes, edges }, networkOptions);
    } else {
        network.setData({ nodes, edges });
    }
}

/* Event wiring  */
loadBtn?.addEventListener("click", async () => {
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        alert("Please choose a .txt/.json file containing { alphabet, accept }.");
        return;
    }
    try {
        const text = await fileInput.files[0].text();
        const lang = JSON.parse(text);

        // Basic validation
        assert(lang && Array.isArray(lang.alphabet) && Array.isArray(lang.accept),
            "Language must have 'alphabet' (array) and 'accept' (array)");
        // Build trie DFA
        originalDFA = buildTrieDFA(lang);
        currentDFA = originalDFA;
        renderDFA(currentDFA);
        setControlsEnabled(true);
        testResult.textContent = "Language represented (DFA built) ✔";
        testResult.style.color = "#2e7d32";
        setTimeout(() => (testResult.textContent = ""), 1400);
    } catch (e) {
        console.error(e);
        alert("Failed to load language: " + e.message);
        setControlsEnabled(false);
    }
});

minimizeBtn?.addEventListener("click", () => {
    if (!currentDFA) return;
    currentDFA = minimizeAcyclicDFA(currentDFA);
    renderDFA(currentDFA);
    testResult.textContent = "Minimized to DAFSA ✔";
    testResult.style.color = "#2e7d32";
    setTimeout(() => (testResult.textContent = ""), 1200);
});

testBtn?.addEventListener("click", () => {
    if (!currentDFA) return;
    const s = (testInput.value || "").trim();
    const { accepted, reason } = accepts(currentDFA, s);
    testResult.textContent = accepted ? `ACCEPT ✅ — ${reason}` : `REJECT ❌ — ${reason}`;
    testResult.style.color = accepted ? "#2e7d32" : "#b63b3b";
});

// expose for debugging
window._dafsa = {
    buildTrieDFA,
    minimizeAcyclicDFA,
    renderDFA,
    accepts: (s) => currentDFA && accepts(currentDFA, s)
};
