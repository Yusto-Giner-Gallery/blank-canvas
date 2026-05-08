import { SoloShowPDF } from "./SoloShowPDF";
import { GroupShowPDF } from "./GroupShowPDF";
import { SpecialPDF } from "./SpecialPDF";
import { ArtFairPDF } from "./ArtFairPDF";
import { CollectorOfferPDF } from "./CollectorOfferPDF";
import { EditorialPDF } from "./EditorialPDF";
import type { CommonProps } from "./shared";

// Dispatcher: each kind has its own visual layout. Adding a new kind
// means writing a new template and adding a case here.
export function DossierPDF(props: CommonProps) {
  switch (props.dossier.kind) {
    case "solo_show":
      return <SoloShowPDF {...props} />;
    case "group_show":
      return <GroupShowPDF {...props} />;
    case "special":
      return <SpecialPDF {...props} />;
    case "art_fair":
      return <ArtFairPDF {...props} />;
    case "collector_offer":
      return <CollectorOfferPDF {...props} />;
    case "editorial":
      return <EditorialPDF {...props} />;
  }
}

export type { CommonProps as DossierPDFProps } from "./shared";
