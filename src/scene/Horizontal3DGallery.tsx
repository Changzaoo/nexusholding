import { useGalleryContent } from '../lib/content';
import { useDeviceProfile } from '../hooks/useDeviceProfile';
import { GlassPanel } from './GlassPanel';

interface Props {
  /** 1 = desktop, <1 reduz painéis decorativos (mobile) */
  quality?: number;
}

/**
 * Galeria 3D: as telas de vidro (galleryContent) espalhadas em profundidade
 * pelo corredor. No desktop ficam dispostas horizontalmente; no mobile
 * (retrato) viram totens verticais centralizados. A revelação (aparecer/
 * sumir) é controlada pelo ExperienceCanvas — os cards surgem JUNTO com os
 * planetas, atrás do flash branco, e ficam presentes durante a travessia.
 */
export function Horizontal3DGallery(_props: Props) {
  const { isMobile } = useDeviceProfile();
  const cards = useGalleryContent(isMobile);
  return (
    <group>
      {cards.map((card) => (
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
