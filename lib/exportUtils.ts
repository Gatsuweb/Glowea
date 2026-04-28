import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Exporte un élément HTML en PDF
 * @param elementId L'ID de l'élément HTML à capturer
 * @param filename Le nom du fichier PDF (sans l'extension .pdf)
 * @param orientation L'orientation du PDF ('portrait' ou 'landscape')
 */
export const exportElementToPDF = async (
  elementId: string, 
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
) => {
  const originalElement = document.getElementById(elementId);
  
  if (!originalElement) {
    console.error(`L'élément avec l'ID ${elementId} est introuvable.`);
    return false;
  }

  try {
    // 1. Créer un clone de l'élément pour ne pas perturber l'interface utilisateur
    const clone = originalElement.cloneNode(true) as HTMLElement;
    
    // 2. Appliquer des styles au clone pour qu'il s'étende complètement
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.width = `${originalElement.offsetWidth}px`; // Garder la même largeur
    clone.style.height = 'auto';
    clone.style.overflow = 'visible';
    clone.style.backgroundColor = '#ffffff';

    // 3. L'ajouter temporairement au body pour que getComputedStyle fonctionne
    document.body.appendChild(clone);

    // 4. Identifier tous les enfants avec un scroll (ex: gridBody) pour les étendre
    const scrollableChildren = Array.from(clone.querySelectorAll('*')).filter(el => {
      if (!(el instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(el);
      return style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'hidden' || style.overflow === 'auto';
    }) as HTMLElement[];

    scrollableChildren.forEach(el => {
      el.style.height = 'auto';
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible';
    });

    // Attendre un court instant pour s'assurer que le navigateur a recalculé la mise en page
    await new Promise(resolve => setTimeout(resolve, 200));

    // 5. Capturer le clone
    const canvas = await html2canvas(clone, {
      scale: 2, // Meilleure qualité
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // 6. Nettoyer en supprimant le clone
    document.body.removeChild(clone);

    const imgData = canvas.toDataURL('image/png');
    
    // Dimensions A4 en mm
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgProps = pdf.getImageProperties(imgData);
    const imgRatio = imgProps.width / imgProps.height;
    
    const renderWidth = pdfWidth;
    const renderHeight = pdfWidth / imgRatio;

    // 7. Gestion multi-pages si l'élément est très long
    let heightLeft = renderHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, renderWidth, renderHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = position - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, renderWidth, renderHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    return false;
  }
};
