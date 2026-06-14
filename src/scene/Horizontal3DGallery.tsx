import { galleryCards } from '../data/galleryContent';
import { GlassPanel } from './GlassPanel';

interface Props {
  /** 1 = desktop, <1 reduz painéis decorativos (mobile) */
  quality?: number;
}

/**
 * Galeria horizontal 3D: as telas de vidro (galleryContent) espalhadas em
 * profundidade pelo corredor. A revelação (aparecer/sumir) é controlada
 * pelo ExperienceCanvas — os cards surgem JUNTO com os planetas, atrás do
 * flash branco, e ficam presentes durante toda a travessia.
 */
export function Horizontal3DGallery(_props: Props) {
  return (
    <group>
      {galleryCards.map((card) => (
        <GlassPanel
          key={card.id}
          position={card.position}
          rotation={card.rotation}
          size={card.size}
          title={card.title}
          tag={card.tag}
          body={card.body}
          index={card.index}
          accent={card.accent}
          hero={card.hero}
        />
      ))}
    </group>
  );
}
