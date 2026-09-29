import { CreationsShell, Section } from "@/components/creations-sections";
import { FlagGuesser } from "@/components/games/flag-guesser";

export const metadata = { title: "Flag Guesser" };

export default function FlagGuesserPage() {
    return (
        <CreationsShell
            bg="#55ffff"
            accent="var(--mc-aqua)"
            nav={[{ id: "play", label: "Play" }]}
            eyebrow="Unlimited Games"
            title="Flag Guesser"
            symbol="speed"
            description="Ten flags, four choices each. A starter set of countries for now; more flags and modes are on the way."
            back={{ href: "/creations/games", label: "Back to Games" }}
        >
            <Section id="play" first accent="var(--mc-aqua)" symbol="fortune" title="Play">
                <FlagGuesser />
            </Section>
        </CreationsShell>
    );
}
