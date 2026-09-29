import { CreationsShell, Section } from "@/components/creations-sections";
import { OutlineGuesser } from "@/components/games/outline-guesser";

export const metadata = { title: "Outline Guesser" };

export default function OutlineGuesserPage() {
    return (
        <CreationsShell
            bg="#55ffff"
            accent="var(--mc-aqua)"
            nav={[{ id: "play", label: "Play" }]}
            eyebrow="Daily and Unlimited"
            title="Outline Guesser"
            symbol="location"
            description="Name the country or territory from its outline. Six guesses; every miss shows the distance, the direction to the target and how close you are."
            back={{ href: "/creations/games", label: "Back to Games" }}
        >
            <Section
                id="play"
                first
                accent="var(--mc-aqua)"
                symbol="fortune"
                title="Play"
            >
                <OutlineGuesser />
            </Section>
        </CreationsShell>
    );
}
