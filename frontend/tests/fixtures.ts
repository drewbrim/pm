export const demoBoard = {
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: ["card-1", "card-2"] },
    { id: "col-discovery", title: "Discovery", cardIds: ["card-3"] },
    { id: "col-progress", title: "In Progress", cardIds: ["card-4", "card-5"] },
    { id: "col-review", title: "Review", cardIds: ["card-6"] },
    { id: "col-done", title: "Done", cardIds: ["card-7", "card-8"] },
  ],
  cards: {
    "card-1": { id: "card-1", title: "Align roadmap themes", details: "..." },
    "card-2": { id: "card-2", title: "Gather customer signals", details: "..." },
    "card-3": { id: "card-3", title: "Prototype analytics view", details: "..." },
    "card-4": { id: "card-4", title: "Refine status language", details: "..." },
    "card-5": { id: "card-5", title: "Design card layout", details: "..." },
    "card-6": { id: "card-6", title: "QA micro-interactions", details: "..." },
    "card-7": { id: "card-7", title: "Ship marketing page", details: "..." },
    "card-8": { id: "card-8", title: "Close onboarding sprint", details: "..." },
  },
};

export const emptyBoard = {
  columns: [
    { id: "col-backlog", title: "Backlog", cardIds: [] },
    { id: "col-discovery", title: "Discovery", cardIds: [] },
    { id: "col-progress", title: "In Progress", cardIds: [] },
    { id: "col-review", title: "Review", cardIds: [] },
    { id: "col-done", title: "Done", cardIds: [] },
  ],
  cards: {},
};
