export function getLevelDescriptor(input: { difficulty: string; size: number }) {
  if (input.difficulty === "easy" && input.size <= 5) {
    return {
      label: "Warmup",
      description: "Ideal for learning deduction patterns.",
    };
  }

  if (input.difficulty === "medium" && input.size <= 7) {
    return {
      label: "Tactical",
      description: "A balanced board with a few sharp pivots.",
    };
  }

  if (input.difficulty === "expert") {
    return {
      label: "Crown Test",
      description: "Built for players chasing their cleanest solve.",
    };
  }

  if (input.difficulty === "hard" || input.size >= 8) {
    return {
      label: "Dense Board",
      description: "Expect tight spacing and punishing overlaps.",
    };
  }

  return {
    label: "Classic",
    description: "A steady logic board with one clean solution.",
  };
}
