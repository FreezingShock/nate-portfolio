import {
    ArtCollectionSection,
    CreationsShell,
} from "@/components/creations-sections";
import { ART_COLLECTIONS, categoryById } from "@/lib/creations-data";

const cat = categoryById("artwork");

export default function ArtworkPage() {
    return (
        <CreationsShell
            bg={cat.bg}
            accent={cat.color}
            nav={ART_COLLECTIONS.map((c) => ({ id: c.id, label: c.title }))}
            eyebrow="Creations"
            title="Artwork"
            symbol="flower"
            description="The AP Art portfolio, Blender renders and drawings. The slots below are placeholders waiting for real pieces."
            back={{ href: "/creations", label: "Back to Creations" }}
        >
            {ART_COLLECTIONS.map((c) => (
                <ArtCollectionSection key={c.id} collection={c} />
            ))}
        </CreationsShell>
    );
}

export const metadata = { title: "Artwork" };
