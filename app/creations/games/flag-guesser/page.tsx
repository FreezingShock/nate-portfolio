import { CreationsShell, Section } from "@/components/creations-sections";
import { FlagGuesser } from "@/components/games/flag-guesser";

export const metadata = { title: "Flag Guesser" };

export default function FlagGuesserPage() {
    return (
        <CreationsShell
            bg="#55ffff"
            accent="var(--mc-aqua)"
            nav={[{ id: "play", label: "Play" }]}
            eyebrow="Daily and Unlimited"
            title="Flag Guesser"
            symbol="fortune"
            description="Name the country from its flag. It starts hidden behind six tiles and every wrong guess flips another, with distance and direction clues to the right country."
            back={{ href: "/creations/games", label: "Back to Games" }}
        >
            <Section id="play" first accent="var(--mc-aqua)" symbol="fortune" title="Play">
                <FlagGuesser />
            </Section>
        </CreationsShell>
    );
}
