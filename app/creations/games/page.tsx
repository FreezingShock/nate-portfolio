import { CreationsShell, GameModeSection } from "@/components/creations-sections";
import { GAME_MODES, categoryById } from "@/lib/creations-data";

const cat = categoryById("games");

export default function GamesPage() {
    return (
        <CreationsShell
            bg={cat.bg}
            accent={cat.color}
            nav={GAME_MODES.map((m) => ({ id: m.id, label: m.title }))}
            eyebrow="Creations"
            title="Web App Games"
            symbol="fortune"
            description="Games that run right here in your browser: daily puzzles, unlimited practice, incremental progression and tycoon games. Most are still placeholders, and we're building them one at a time."
            back={{ href: "/creations", label: "Back to Creations" }}
        >
            {GAME_MODES.map((m, i) => (
                <GameModeSection key={m.id} mode={m} first={i === 0} />
            ))}
        </CreationsShell>
    );
}

export const metadata = { title: "Games" };
