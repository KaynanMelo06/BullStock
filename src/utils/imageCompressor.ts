/**
 * Resizes and compresses an image in the browser using HTML5 Canvas.
 * Produces a lightweight Base64 Data URL (typically 15KB - 45KB)
 * to store safely in Firestore within the Spark plan limits without Firebase Storage.
 */
export async function compressImageToBase64(
  file: File,
  maxDimension = 480,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível inicializar o canvas de imagem.'));
          return;
        }

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to webp if supported, or jpeg
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Check size (must be <= 75KB for safety)
        if (dataUrl.length > 80000) {
          // Re-compress with lower quality
          dataUrl = canvas.toDataURL('image/jpeg', 0.45);
        }

        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Falha ao processar arquivo de imagem.'));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Erro na leitura do arquivo.'));
    reader.readAsDataURL(file);
  });
}
