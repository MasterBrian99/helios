import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Upload01FreeIcons,
  ViewIcon,
  BarChartIcon,
  Delete01Icon,
  GridIcon,
  ListViewIcon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  ChessPawnIcon,
  FilterIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  FileExportIcon,
  CheckmarkCircle02Icon,
  Loading01Icon,
} from "@hugeicons/core-free-icons";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type GameResult = "1-0" | "0-1" | "½-½";
type GameColor = "white" | "black";
type TimeControl = "bullet" | "blitz" | "rapid" | "classical";
type AnalysisStatus = "analyzed" | "pending";

interface Game {
  id: string;
  date: string;
  opening: string;
  ecoCode: string;
  whitePlayer: string;
  whiteRating: number;
  blackPlayer: string;
  blackRating: number;
  result: GameResult;
  playerColor: GameColor;
  timeControl: TimeControl;
  analysisStatus: AnalysisStatus;
  mistakes: number;
  accuracy: number | null;
}

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────

const YOU = "You";

const mockGames: Game[] = [
  {
    id: "1",
    date: "2026-02-19T14:22:00",
    opening: "Sicilian Najdorf",
    ecoCode: "B90",
    whitePlayer: YOU,
    whiteRating: 1842,
    blackPlayer: "Magnus_Fan",
    blackRating: 1790,
    result: "1-0",
    playerColor: "white",
    timeControl: "blitz",
    analysisStatus: "analyzed",
    mistakes: 1,
    accuracy: 91.4,
  },
  {
    id: "2",
    date: "2026-02-19T10:05:00",
    opening: "Ruy Lopez",
    ecoCode: "C65",
    whitePlayer: "ChessKing99",
    whiteRating: 1901,
    blackPlayer: YOU,
    blackRating: 1842,
    result: "0-1",
    playerColor: "black",
    timeControl: "rapid",
    analysisStatus: "analyzed",
    mistakes: 3,
    accuracy: 78.2,
  },
  {
    id: "3",
    date: "2026-02-18T21:44:00",
    opening: "Queen's Gambit Declined",
    ecoCode: "D30",
    whitePlayer: "PawnStorm",
    whiteRating: 1755,
    blackPlayer: YOU,
    blackRating: 1842,
    result: "½-½",
    playerColor: "black",
    timeControl: "classical",
    analysisStatus: "analyzed",
    mistakes: 2,
    accuracy: 84.0,
  },
  {
    id: "4",
    date: "2026-02-18T15:30:00",
    opening: "King's Indian Defense",
    ecoCode: "E68",
    whitePlayer: YOU,
    whiteRating: 1842,
    blackPlayer: "TacticsGuru",
    blackRating: 1965,
    result: "0-1",
    playerColor: "white",
    timeControl: "blitz",
    analysisStatus: "pending",
    mistakes: 7,
    accuracy: null,
  },
  {
    id: "5",
    date: "2026-02-17T20:15:00",
    opening: "French Defense",
    ecoCode: "C11",
    whitePlayer: "EndgameMaster",
    whiteRating: 1680,
    blackPlayer: YOU,
    blackRating: 1842,
    result: "1-0",
    playerColor: "black",
    timeControl: "bullet",
    analysisStatus: "analyzed",
    mistakes: 5,
    accuracy: 66.7,
  },
  {
    id: "6",
    date: "2026-02-17T18:00:00",
    opening: "Italian Game",
    ecoCode: "C50",
    whitePlayer: YOU,
    whiteRating: 1842,
    blackPlayer: "PositionalPlayer",
    blackRating: 1820,
    result: "1-0",
    playerColor: "white",
    timeControl: "rapid",
    analysisStatus: "analyzed",
    mistakes: 0,
    accuracy: 97.1,
  },
  {
    id: "7",
    date: "2026-02-16T22:10:00",
    opening: "Caro-Kann Defense",
    ecoCode: "B13",
    whitePlayer: "SpeedDemon",
    whiteRating: 1910,
    blackPlayer: YOU,
    blackRating: 1842,
    result: "½-½",
    playerColor: "black",
    timeControl: "bullet",
    analysisStatus: "pending",
    mistakes: 4,
    accuracy: null,
  },
  {
    id: "8",
    date: "2026-02-16T14:55:00",
    opening: "English Opening",
    ecoCode: "A10",
    whitePlayer: YOU,
    whiteRating: 1842,
    blackPlayer: "OpeningBook",
    blackRating: 1830,
    result: "1-0",
    playerColor: "white",
    timeControl: "classical",
    analysisStatus: "analyzed",
    mistakes: 2,
    accuracy: 88.5,
  },
  {
    id: "9",
    date: "2026-02-15T11:30:00",
    opening: "Nimzo-Indian Defense",
    ecoCode: "E32",
    whitePlayer: "MaterialAdvantage",
    whiteRating: 1875,
    blackPlayer: YOU,
    blackRating: 1842,
    result: "0-1",
    playerColor: "black",
    timeControl: "rapid",
    analysisStatus: "analyzed",
    mistakes: 6,
    accuracy: 71.3,
  },
  {
    id: "10",
    date: "2026-02-14T19:20:00",
    opening: "Pirc Defense",
    ecoCode: "B07",
    whitePlayer: YOU,
    whiteRating: 1842,
    blackPlayer: "AggressiveAttacker",
    blackRating: 1798,
    result: "1-0",
    playerColor: "white",
    timeControl: "blitz",
    analysisStatus: "analyzed",
    mistakes: 1,
    accuracy: 93.6,
  },
  {
    id: "11",
    date: "2026-02-14T12:05:00",
    opening: "London System",
    ecoCode: "D10",
    whitePlayer: "SolidPlayer",
    whiteRating: 1720,
    blackPlayer: YOU,
    blackRating: 1842,
    result: "1-0",
    playerColor: "black",
    timeControl: "blitz",
    analysisStatus: "pending",
    mistakes: 9,
    accuracy: null,
  },
  {
    id: "12",
    date: "2026-02-13T17:45:00",
    opening: "Scotch Game",
    ecoCode: "C44",
    whitePlayer: YOU,
    whiteRating: 1842,
    blackPlayer: "ClassicMoves",
    blackRating: 1865,
    result: "½-½",
    playerColor: "white",
    timeControl: "rapid",
    analysisStatus: "analyzed",
    mistakes: 3,
    accuracy: 82.9,
  },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function getResultLabel(result: GameResult, playerColor: GameColor) {
  if (result === "½-½") return "draw";
  const playerWon =
    (result === "1-0" && playerColor === "white") ||
    (result === "0-1" && playerColor === "black");
  return playerWon ? "win" : "loss";
}

function getResultStyles(outcome: string) {
  switch (outcome) {
    case "win":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "draw":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "loss":
      return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
    default:
      return "";
  }
}

function getMistakeStyles(count: number) {
  if (count < 2) return "text-emerald-600 dark:text-emerald-400 font-semibold";
  if (count <= 4) return "text-amber-600 dark:text-amber-400 font-semibold";
  return "text-red-600 dark:text-red-400 font-semibold";
}

function getAccuracyColor(accuracy: number | null) {
  if (accuracy === null) return "text-muted-foreground";
  if (accuracy >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (accuracy >= 75) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

const TIME_CONTROL_LABELS: Record<TimeControl, string> = {
  bullet: "⚡ Bullet",
  blitz: "🔥 Blitz",
  rapid: "⏱️ Rapid",
  classical: "🕐 Classical",
};

// ─────────────────────────────────────────────
// Result Badge
// ─────────────────────────────────────────────

function ResultBadge({ game }: { game: Game }) {
  const outcome = getResultLabel(game.result, game.playerColor);
  const styles = getResultStyles(outcome);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
        styles,
      )}
    >
      {game.result}
    </span>
  );
}

// ─────────────────────────────────────────────
// Checkbox (native styled)
// ─────────────────────────────────────────────

function Checkbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (v: boolean) => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="size-4 rounded border-border accent-primary cursor-pointer"
    />
  );
}

// ─────────────────────────────────────────────
// Game Card (Grid View)
// ─────────────────────────────────────────────

function GameCard({
  game,
  selected,
  onSelect,
}: {
  game: Game;
  selected: boolean;
  onSelect: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const outcome = getResultLabel(game.result, game.playerColor);
  const resultStyles = getResultStyles(outcome);
  const opponent =
    game.playerColor === "white" ? game.blackPlayer : game.whitePlayer;
  const opponentRating =
    game.playerColor === "white" ? game.blackRating : game.whiteRating;

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:border-primary/30 cursor-pointer overflow-hidden",
        selected && "border-primary/60 ring-2 ring-primary/20",
      )}
      onClick={() => navigate({ to: "/app" })}
    >
      {/* Selection checkbox */}
      <div
        className="absolute top-3 left-3 z-10"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(!selected);
        }}
      >
        <Checkbox checked={selected} onChange={onSelect} />
      </div>

      {/* Color stripe */}
      <div
        className={cn(
          "h-1 w-full",
          game.playerColor === "white"
            ? "bg-linear-to-r from-slate-300 to-slate-100"
            : "bg-linear-to-r from-slate-800 to-slate-600",
        )}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {formatDate(game.date)} · {formatTime(game.date)}
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5 line-clamp-1">
              {game.ecoCode} – {game.opening}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
              resultStyles,
            )}
          >
            {game.result}
          </span>
        </div>

        {/* Players */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "inline-block size-3 rounded-full border border-border",
                game.playerColor === "white" ? "bg-white" : "bg-slate-800",
              )}
            />
            <span className="font-medium text-foreground">
              {game.playerColor === "white"
                ? game.whitePlayer
                : game.blackPlayer}
            </span>
            <span className="text-muted-foreground ml-auto text-xs">
              {game.playerColor === "white"
                ? game.whiteRating
                : game.blackRating}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "inline-block size-3 rounded-full border border-border",
                game.playerColor === "white" ? "bg-slate-800" : "bg-white",
              )}
            />
            <span className="text-muted-foreground">{opponent}</span>
            <span className="text-muted-foreground ml-auto text-xs">
              {opponentRating}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            {TIME_CONTROL_LABELS[game.timeControl]}
          </span>
          <span className="text-muted-foreground ml-auto">
            Mistakes:{" "}
            <span className={getMistakeStyles(game.mistakes)}>
              {game.mistakes}
            </span>
          </span>
          {game.accuracy !== null && (
            <span className={getAccuracyColor(game.accuracy)}>
              {game.accuracy.toFixed(1)}%
            </span>
          )}
        </div>

        {/* Analysis badge */}
        <div className="mt-2">
          {game.analysisStatus === "analyzed" ? (
            <Badge variant="secondary" className="text-xs gap-1">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="size-3 text-emerald-500"
              />
              Analyzed
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs gap-1">
              <HugeiconsIcon
                icon={Loading01Icon}
                className="size-3 text-amber-500"
              />
              Pending
            </Badge>
          )}
        </div>
      </div>

      {/* Actions overlay */}
      <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200 bg-card border-t border-border flex">
        <button
          className="flex-1 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center gap-1 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            navigate({ to: "/app" });
          }}
        >
          <HugeiconsIcon icon={ViewIcon} className="size-3.5" />
          View
        </button>
        <button
          className="flex-1 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center gap-1 transition-colors border-x border-border"
          onClick={(e) => e.stopPropagation()}
        >
          <HugeiconsIcon icon={BarChartIcon} className="size-3.5" />
          Analyze
        </button>
        <button
          className="flex-1 py-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center gap-1 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <HugeiconsIcon icon={Delete01Icon} className="size-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

type ViewMode = "table" | "grid";

const GamesPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = React.useState<ViewMode>("table");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Local filter states (controlled, applied on change)
  const [resultFilter, setResultFilter] = React.useState("all");
  const [colorFilter, setColorFilter] = React.useState("all");
  const [timeFilter, setTimeFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  // Filtered data derived from filters
  const filteredData = React.useMemo(() => {
    return mockGames.filter((g) => {
      const outcome = getResultLabel(g.result, g.playerColor);
      if (resultFilter !== "all" && outcome !== resultFilter) return false;
      if (colorFilter !== "all" && g.playerColor !== colorFilter) return false;
      if (timeFilter !== "all" && g.timeControl !== timeFilter) return false;
      if (statusFilter !== "all" && g.analysisStatus !== statusFilter)
        return false;
      return true;
    });
  }, [resultFilter, colorFilter, timeFilter, statusFilter]);

  // Columns
  const columns = React.useMemo<ColumnDef<Game>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onChange={(v) => table.toggleAllPageRowsSelected(v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onChange={(v) => row.toggleSelected(v)}
          />
        ),
        size: 40,
      },
      {
        accessorKey: "date",
        header: ({ column }) => (
          <SortableHeader column={column} label="Date & Time" />
        ),
        cell: ({ row }) => (
          <div className="min-w-[120px]">
            <p className="text-sm font-medium">
              {formatDate(row.original.date)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTime(row.original.date)}
            </p>
          </div>
        ),
      },
      {
        id: "opening",
        header: "Opening",
        cell: ({ row }) => (
          <div className="min-w-[180px]">
            <p className="text-sm font-semibold">
              {row.original.ecoCode} – {row.original.opening}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {TIME_CONTROL_LABELS[row.original.timeControl]}
            </p>
          </div>
        ),
      },
      {
        id: "players",
        header: "Players",
        cell: ({ row }) => {
          const g = row.original;
          return (
            <div className="space-y-0.5 min-w-[160px]">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="inline-block size-2.5 rounded-full bg-white border border-slate-400 shrink-0" />
                <span
                  className={g.playerColor === "white" ? "font-semibold" : ""}
                >
                  {g.whitePlayer}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {g.whiteRating}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <span className="inline-block size-2.5 rounded-full bg-slate-800 border border-slate-600 shrink-0" />
                <span
                  className={
                    g.playerColor === "black"
                      ? "font-semibold"
                      : "text-muted-foreground"
                  }
                >
                  {g.blackPlayer}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {g.blackRating}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "result",
        header: "Result",
        cell: ({ row }) => <ResultBadge game={row.original} />,
      },
      {
        accessorKey: "mistakes",
        header: ({ column }) => (
          <SortableHeader column={column} label="Mistakes" />
        ),
        cell: ({ row }) => (
          <span
            className={cn(
              "flex items-center gap-1",
              getMistakeStyles(row.original.mistakes),
            )}
          >
            {row.original.mistakes}
          </span>
        ),
      },
      {
        accessorKey: "accuracy",
        header: ({ column }) => (
          <SortableHeader column={column} label="Accuracy" />
        ),
        cell: ({ row }) => {
          const acc = row.original.accuracy;
          return (
            <span className={getAccuracyColor(acc)}>
              {acc !== null ? `${acc.toFixed(1)}%` : "—"}
            </span>
          );
        },
      },
      {
        id: "analysisStatus",
        header: "Status",
        cell: ({ row }) =>
          row.original.analysisStatus === "analyzed" ? (
            <Badge variant="secondary" className="text-xs gap-1">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="size-3 text-emerald-500"
              />
              Analyzed
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs gap-1 text-amber-600">
              <HugeiconsIcon icon={Loading01Icon} className="size-3" />
              Pending
            </Badge>
          ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: () => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              title="View"
              onClick={() => navigate({ to: "/app" })}
            >
              <HugeiconsIcon icon={ViewIcon} className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Analyze">
              <HugeiconsIcon icon={BarChartIcon} className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Delete"
              className="hover:text-destructive hover:bg-destructive/10"
            >
              <HugeiconsIcon icon={Delete01Icon} className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [navigate],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const selectedCount = Object.keys(rowSelection).length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = filteredData.length;
  const from = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalRows);

  // Grid selection helpers (row index based since no table row model used)
  const [gridSelection, setGridSelection] = React.useState<Set<string>>(
    new Set(),
  );
  const toggleGridSelect = (id: string, selected: boolean) => {
    setGridSelection((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // Current page for grid view
  const [gridPage, setGridPage] = React.useState(0);
  const gridPageSize = 12;
  const gridData = filteredData.slice(
    gridPage * gridPageSize,
    (gridPage + 1) * gridPageSize,
  );
  const gridTotalPages = Math.ceil(filteredData.length / gridPageSize);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-screen-2xl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <HugeiconsIcon
              icon={ChessPawnIcon}
              strokeWidth={2}
              className="size-8 text-primary"
            />
            My Games
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {mockGames.length} games in your library
          </p>
        </div>
        <Button size="lg" className="gap-2 font-medium">
          <HugeiconsIcon
            icon={Upload01FreeIcons}
            strokeWidth={2}
            className="size-4"
          />
          Upload New Game(s)
        </Button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap gap-2 items-center p-3 rounded-xl bg-muted/40 border">
        <HugeiconsIcon
          icon={FilterIcon}
          className="size-4 text-muted-foreground shrink-0"
        />

        {/* Result Filter */}
        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="h-8 w-auto text-xs">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="win">Wins</SelectItem>
            <SelectItem value="draw">Draws</SelectItem>
            <SelectItem value="loss">Losses</SelectItem>
          </SelectContent>
        </Select>

        {/* Color Filter */}
        <Select value={colorFilter} onValueChange={setColorFilter}>
          <SelectTrigger className="h-8 w-auto text-xs">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colors</SelectItem>
            <SelectItem value="white">White</SelectItem>
            <SelectItem value="black">Black</SelectItem>
          </SelectContent>
        </Select>

        {/* Time Control Filter */}
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="h-8 w-auto text-xs">
            <SelectValue placeholder="Time Control" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time Controls</SelectItem>
            <SelectItem value="bullet">⚡ Bullet</SelectItem>
            <SelectItem value="blitz">🔥 Blitz</SelectItem>
            <SelectItem value="rapid">⏱️ Rapid</SelectItem>
            <SelectItem value="classical">🕐 Classical</SelectItem>
          </SelectContent>
        </Select>

        {/* Analysis Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-auto text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="analyzed">Analyzed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {(resultFilter !== "all" ||
          colorFilter !== "all" ||
          timeFilter !== "all" ||
          statusFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => {
              setResultFilter("all");
              setColorFilter("all");
              setTimeFilter("all");
              setStatusFilter("all");
            }}
          >
            Clear all
          </Button>
        )}

        {/* View Toggle */}
        <div className="ml-auto flex gap-1 bg-background border rounded-lg p-0.5">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("table")}
            title="Table view"
          >
            <HugeiconsIcon icon={ListViewIcon} className="size-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon-sm"
            onClick={() => setViewMode("grid")}
            title="Grid view"
          >
            <HugeiconsIcon icon={GridIcon} className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── Bulk Actions ── */}
      {(selectedCount > 0 || gridSelection.size > 0) && (
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-primary/5 border-primary/20">
          <span className="text-sm font-medium text-primary">
            {viewMode === "table" ? selectedCount : gridSelection.size} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <HugeiconsIcon icon={BarChartIcon} className="size-3.5" />
              Analyze Selected
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <HugeiconsIcon icon={FileExportIcon} className="size-3.5" />
              Export as PGN
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                setRowSelection({});
                setGridSelection(new Set());
              }}
            >
              <HugeiconsIcon icon={Delete01Icon} className="size-3.5" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* ── Table View ── */}
      {viewMode === "table" && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b bg-muted/30">
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="py-16 text-center text-muted-foreground"
                    >
                      No games found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b transition-colors hover:bg-muted/30 cursor-pointer",
                        row.getIsSelected() && "bg-primary/5",
                      )}
                      onClick={() => navigate({ to: "/app" })}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-3"
                          onClick={
                            cell.column.id === "select" ||
                            cell.column.id === "actions"
                              ? (e) => e.stopPropagation()
                              : undefined
                          }
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
            <span className="text-sm text-muted-foreground">
              Showing {from}–{to} of {totalRows} games
            </span>
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => table.setPageSize(Number(v))}
              >
                <SelectTrigger className="h-7 text-xs w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
                </Button>
                {Array.from({ length: table.getPageCount() }, (_, i) => (
                  <Button
                    key={i}
                    variant={pageIndex === i ? "default" : "outline"}
                    size="icon-sm"
                    className="text-xs"
                    onClick={() => table.setPageIndex(i)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Grid View ── */}
      {viewMode === "grid" && (
        <div className="space-y-4">
          {gridData.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground border rounded-xl bg-card">
              No games found for the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {gridData.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  selected={gridSelection.has(game.id)}
                  onSelect={(v) => toggleGridSelect(game.id, v)}
                />
              ))}
            </div>
          )}

          {/* Grid Pagination */}
          <div className="flex items-center justify-between px-1">
            <span className="text-sm text-muted-foreground">
              Showing{" "}
              {filteredData.length === 0 ? 0 : gridPage * gridPageSize + 1}–
              {Math.min((gridPage + 1) * gridPageSize, filteredData.length)} of{" "}
              {filteredData.length} games
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setGridPage((p) => Math.max(0, p - 1))}
                disabled={gridPage === 0}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
              </Button>
              {Array.from({ length: gridTotalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={gridPage === i ? "default" : "outline"}
                  size="icon-sm"
                  className="text-xs"
                  onClick={() => setGridPage(i)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() =>
                  setGridPage((p) => Math.min(gridTotalPages - 1, p + 1))
                }
                disabled={gridPage >= gridTotalPages - 1}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Sortable Header Helper
// ─────────────────────────────────────────────

function SortableHeader({
  column,
  label,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  column: any;
  label: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      {sorted === "asc" ? (
        <HugeiconsIcon icon={ArrowUp01Icon} className="size-3" />
      ) : sorted === "desc" ? (
        <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
      ) : (
        <span className="size-3 opacity-30">↕</span>
      )}
    </button>
  );
}

// Fix: close the SelectContent tag correctly
export default GamesPage;
