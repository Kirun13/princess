// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LevelCompleteModal } from "@/components/game/LevelCompleteModal";
import { useGameStore } from "@/lib/store/gameStore";

const pushMock = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: unknown) => mockUseMutation(options),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: ComponentProps<"div">) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: ComponentProps<"p">) => <p {...props}>{children}</p>,
  },
}));

function setSolvedState() {
  useGameStore.setState({
    grid: [[0]],
    size: 1,
    puzzleId: "puzzle-1",
    queens: [[0, 0]],
    conflicts: new Set(),
    marks: new Set<string>(),
    startedAt: null,
    activeMs: 13_779,
    isPaused: false,
    pausedAt: null,
    isSolved: true,
    startToken: "token-1",
    isHowToPlayOpen: false,
  });
}

function createSolveMutation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    isPending: false,
    isError: false,
    isSuccess: false,
    data: undefined,
    error: null,
    mutate: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function createRatingMutation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    mutate: vi.fn(),
    ...overrides,
  };
}

function renderModal({
  isAuthenticated = true,
  solveMutation = createSolveMutation(),
  ratingMutation = createRatingMutation(),
}: {
  isAuthenticated?: boolean;
  solveMutation?: ReturnType<typeof createSolveMutation>;
  ratingMutation?: ReturnType<typeof createRatingMutation>;
} = {}) {
  mockUseMutation.mockImplementation((options?: { onSuccess?: unknown }) =>
    options && "onSuccess" in options ? ratingMutation : solveMutation
  );

  return render(
    <LevelCompleteModal
      puzzleId="puzzle-1"
      levelId="level-1"
      nextLevelId="level-2"
      dailyChallengeId={undefined}
      isAuthenticated={isAuthenticated}
      userRating={3}
      avgRating={4.2}
      ratingCount={12}
    />
  );
}

describe("LevelCompleteModal", () => {
  beforeEach(() => {
    pushMock.mockReset();
    mockUseMutation.mockReset();
    setSolvedState();
  });

  it("renders the solved time only once", () => {
    renderModal({
      solveMutation: createSolveMutation({
        isSuccess: true,
        data: {
          solveId: "solve-1",
          timeMs: 13_779,
          isPersonalBest: true,
          rank: 1,
          totalSolvers: 1,
          averageTimeMs: 7_611,
          topTimeMs: 7_611,
          beatAverage: false,
          unlockedAchievements: [],
        },
      }),
    });

    expect(screen.getAllByText("00:13.779")).toHaveLength(1);
  });

  it("keeps summary content and actions in separate desktop columns", () => {
    renderModal({
      solveMutation: createSolveMutation({
        isSuccess: true,
        data: {
          solveId: "solve-1",
          timeMs: 13_779,
          isPersonalBest: true,
          rank: 1,
          totalSolvers: 1,
          averageTimeMs: 7_611,
          topTimeMs: 7_611,
          beatAverage: false,
          unlockedAchievements: [
            {
              type: "level-apprentice",
              title: "Level Apprentice",
              description: "Clear 5 main levels.",
            },
          ],
        },
      }),
      ratingMutation: createRatingMutation(),
    });

    const summary = screen.getByTestId("level-complete-summary");
    const actions = screen.getByTestId("level-complete-actions");

    expect(within(summary).getByText("Your Time")).toBeInTheDocument();
    expect(within(summary).getByText(/you rank/i)).toBeInTheDocument();
    expect(within(summary).getByText("Unlocked Achievements")).toBeInTheDocument();
    expect(within(summary).getByText("00:06.168 off average")).toBeInTheDocument();
    expect(within(summary).queryByRole("button", { name: /next level/i })).not.toBeInTheDocument();

    expect(within(actions).getByText(/rate difficulty/i)).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: /share result/i })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: /next level/i })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: /go back/i })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: /play again/i })).toBeInTheDocument();
    expect(within(actions).queryByText("Unlocked Achievements")).not.toBeInTheDocument();
  });

  it("keeps guest prompts and responsive layout hooks intact", () => {
    renderModal({
      isAuthenticated: false,
      solveMutation: createSolveMutation(),
      ratingMutation: createRatingMutation(),
    });

    const layout = screen.getByTestId("level-complete-layout");
    const summary = screen.getByTestId("level-complete-summary");
    const actions = screen.getByTestId("level-complete-actions");

    expect(layout.className).toContain("lg:grid-cols-[minmax(0,1fr)_320px]");
    expect(within(summary).getByText("Your Time")).toBeInTheDocument();
    expect(within(actions).getByText(/sign in to save your time and see rankings/i)).toBeInTheDocument();
    expect(within(actions).getByText(/sign in to rate/i)).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: /next level/i })).toBeInTheDocument();
  });
});
