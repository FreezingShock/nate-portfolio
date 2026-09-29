import { CreationsShell, Section } from "@/components/creations-sections";
import { FracturedIdle } from "@/components/games/fractured-idle";

export const metadata = { title: "Fractured Idle" };

export default function FracturedIdlePage() {
    return (
        <CreationsShell
            bg="#ff55ff"
            accent="var(--mc-light-purple)"
            nav={[{ id: "play", label: "Play" }]}
            eyebrow="Incremental"
            title="Fractured Idle"
            symbol="wisdom"
            description="Click the button, hire minions, unlock islands and rebirth. A button-simulator incremental with SkyBlock flavor. Saves in your browser and keeps earning while you're away."
            back={{ href: "/creations/games", label: "Back to Games" }}
        >
            <Section id="play" first accent="var(--mc-light-purple)" symbol="wisdom" title="Play">
                <FracturedIdle />
            </Section>
        </CreationsShell>
    );
}
