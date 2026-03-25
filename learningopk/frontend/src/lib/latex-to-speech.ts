const greekLetters: Record<string, string> = {
  alpha: "alpha",
  beta: "beta",
  gamma: "gamma",
  delta: "delta",
  epsilon: "epsilon",
  zeta: "zeta",
  eta: "eta",
  theta: "theta",
  iota: "iota",
  kappa: "kappa",
  lambda: "lambda",
  mu: "mu",
  nu: "nu",
  xi: "xi",
  omicron: "omicron",
  pi: "pi",
  rho: "rho",
  sigma: "sigma",
  tau: "tau",
  upsilon: "upsilon",
  phi: "phi",
  chi: "chi",
  psi: "psi",
  omega: "omega",
  Alpha: "Alpha",
  Beta: "Beta",
  Gamma: "Gamma",
  Delta: "Delta",
  Epsilon: "Epsilon",
  Zeta: "Zeta",
  Eta: "Eta",
  Theta: "Theta",
  Iota: "Iota",
  Kappa: "Kappa",
  Lambda: "Lambda",
  Mu: "Mu",
  Nu: "Nu",
  Xi: "Xi",
  Omicron: "Omicron",
  Pi: "Pi",
  Rho: "Rho",
  Sigma: "Sigma",
  Tau: "Tau",
  Upsilon: "Upsilon",
  Phi: "Phi",
  Chi: "Chi",
  Psi: "Psi",
  Omega: "Omega",
};

const superscripts: Record<string, string> = {
  "0": "0",
  "1": "1",
  "2": "squared",
  "3": "cubed",
  "4": "to the 4th",
  "5": "to the 5th",
  "6": "to the 6th",
  "7": "to the 7th",
  "8": "to the 8th",
  "9": "to the 9th",
  n: "to the n",
  i: "to the i",
  j: "to the j",
  k: "to the k",
  x: "to the x",
  y: "to the y",
  z: "to the z",
  "+": "to the plus",
  "-": "to the minus",
  "=": "to the equals",
};

const relations: Record<string, string> = {
  "=": "equals",
  "\\neq": "not equal to",
  "\\approx": "approximately equals",
  "\\equiv": "is equivalent to",
  "\\le": "less than or equal to",
  "\\leq": "less than or equal to",
  "\\ge": "greater than or equal to",
  "\\geq": "greater than or equal to",
  "\\pm": "plus or minus",
  "\\times": "times",
  "\\div": "divided by",
  "\\cdot": "dot",
  "<": "less than",
  ">": "greater than",
  "\\in": "in",
  "\\notin": "not in",
  "\\subset": "subset of",
  "\\subseteq": "subset of or equal to",
  "\\cup": "union",
  "\\cap": "intersection",
  "\\infty": "infinity",
};

const operators: Record<string, string> = {
  "+": "plus",
  "-": "minus",
  "\\pm": "plus or minus",
  "\\times": "times",
  "\\div": "divided by",
  "\\cdot": "times",
  "\\sum": "sum",
  "\\prod": "product",
  "\\int": "integral",
  "\\oint": "contour integral",
};

const complexCommands = ["\\frac", "\\sqrt", "\\sum", "\\int", "\\prod", "\\lim", "\\log", "\\ln", "\\sin", "\\cos", "\\tan", "\\arcsin", "\\arccos", "\\arctan"];

function isComplexEquation(latex: string): boolean {
  return complexCommands.some((cmd) => latex.includes(cmd));
}

function parseLatexTokens(latex: string): string {
  let result = latex;
  result = result.replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/g, "$1 over $2");
  result = result.replace(/\\sqrt\s*(?:\[[^\]]+\])?\s*\{([^}]+)\}/g, "square root of $1");
  result = result.replace(/\\sum\s*_\{([^}]+)\}\s*\^\{([^}]+)\}/g, "sum from $1 to $2");
  result = result.replace(/\\int\s*_\{([^}]+)\}\s*\^\{([^}]+)\}/g, "integral from $1 to $2");
  result = result.replace(/\\prod\s*_\{([^}]+)\}\s*\^\{([^}]+)\}/g, "product from $1 to $2");
  result = result.replace(/\\lim\s*_\{([^}]+)\}/g, "limit as $1");
  result = result.replace(/\\log_\{([^}]+)\}/g, "log base $1");
  result = result.replace(/\\ln/g, "natural log");
  result = result.replace(/\\sin/g, "sine");
  result = result.replace(/\\cos/g, "cosine");
  result = result.replace(/\\tan/g, "tangent");
  result = result.replace(/\\arcsin/g, "arc sine");
  result = result.replace(/\\arccos/g, "arc cosine");
  result = result.replace(/\\arctan/g, "arc tangent");
  result = result.replace(/\\log/g, "log");
  result = result.replace(/\\exp/g, "exponential");
  result = result.replace(/\{([^}]+)\}/g, "$1");
  result = result.replace(/\^([a-zA-Z0-9+\-=]+)/g, (_match, p1) => {
    return " to the " + (superscripts[p1] || p1);
  });
  result = result.replace(/\^2/g, " squared");
  result = result.replace(/\^3/g, " cubed");
  result = result.replace(/_([a-zA-Z0-9]+)/g, " $1");
  result = result.replace(/\\([a-zA-Z]+)/g, (_match, p1) => {
    return greekLetters[p1] || operators[p1] || relations[p1] || p1;
  });
  result = result.replace(/([=<>])/g, (_match, p1) => {
    return " " + (relations[p1] || p1) + " ";
  });
  result = result.replace(/([+\-×÷·])/g, (_match, p1) => {
    return " " + (operators[p1] || p1) + " ";
  });
  result = result.replace(/\s+/g, " ").trim();
  return result;
}

export function latexToSpokenForm(latex: string): string {
  try {
    const cleaned = latex.replace(/\\\((.*?)\\\)/, "$1").replace(/\\\[(.*?)\\\]/, "$1").trim();
    if (!cleaned) return "";
    return parseLatexTokens(cleaned);
  } catch {
    return latex;
  }
}

export function generateEquationDescription(latex: string): string {
  const spoken = latexToSpokenForm(latex);
  if (latex.includes("\\frac")) {
    const match = latex.match(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/);
    if (match) {
      return `Fraction: ${spoken}`;
    }
  }
  if (latex.includes("\\sqrt")) {
    return `Square root: ${spoken}`;
  }
  if (latex.includes("\\sum")) {
    return `Summation: ${spoken}`;
  }
  if (latex.includes("\\int")) {
    return `Integral: ${spoken}`;
  }
  if (latex.includes("\\prod")) {
    return `Product: ${spoken}`;
  }
  if (latex.includes("\\lim")) {
    return `Limit: ${spoken}`;
  }
  return spoken;
}

export { isComplexEquation };
