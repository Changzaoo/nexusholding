import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { UseCopilotReturn } from '../../../hooks/useCopilot';
import type { DocumentFile } from '../../../types/copilot';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/webp',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.csv', '.xlsx', '.png', '.jpg', '.jpeg', '.webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function DocumentMode({ copilot }: { copilot: UseCopilotReturn }) {
  const { state, addDocument, removeDocument, updateDocument, sendMessage } = copilot;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      
      for (const file of files) {
        // Validar tipo
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          alert(`Arquivo ${file.name} não é suportado.`);
          continue;
        }

        // Validar tamanho
        if (file.size > MAX_FILE_SIZE) {
          alert(`Arquivo ${file.name} é muito grande. Máximo: 10MB.`);
          continue;
        }

        const docFile: DocumentFile = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          file,
          status: 'pending',
          progress: 0,
        };

        addDocument(docFile);

        // Simular upload
        updateDocument(docFile.id, { status: 'uploading', progress: 0 });
        
        // Simular progresso
        for (let i = 0; i <= 100; i += 10) {
          await new Promise((r) => setTimeout(r, 50));
          updateDocument(docFile.id, { progress: i });
        }
        
        updateDocument(docFile.id, { status: 'done', progress: 100 });
      }

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addDocument, updateDocument]
  );

  const handleAnalyze = async () => {
    const docs = state.context.documents.filter((d) => d.status === 'done');
    if (docs.length === 0) return;

    const fileList = docs.map((d) => d.name).join(', ');
    const message = `## Análise de Documentos\n\nArquivos carregados: ${fileList}\n\nPor favor, analise esses documentos e forneça insights relevantes.`;

    await sendMessage(message, '/api/analyze');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="border-t" style={{ borderColor: 'rgba(65, 232, 255, 0.08)' }}>
      {/* Upload area */}
      <div
        className="m-4 cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-colors hover:border-neon-cyan/50"
        style={{ borderColor: 'rgba(65, 232, 255, 0.2)' }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        <p className="text-2xl mb-2">📄</p>
        <p className="font-mono text-xs text-white/60">
          Clique ou arraste arquivos aqui
        </p>
        <p className="mt-1 font-mono text-[10px] text-white/30">
          PDF, DOCX, TXT, CSV, XLSX, PNG, JPG, WEBP (max 10MB)
        </p>
      </div>

      {/* File list */}
      {state.context.documents.length > 0 && (
        <div className="max-h-[120px] overflow-y-auto px-4 pb-2">
          {state.context.documents.map((doc) => (
            <div
              key={doc.id}
              className="mb-2 flex items-center gap-3 rounded-lg p-2"
              style={{ background: 'rgba(255, 255, 255, 0.03)' }}
            >
              <span className="text-lg">
                {doc.type.includes('image') ? '🖼️' : '📄'}
              </span>
              
              <div className="flex-1 min-w-0">
                <p className="truncate font-mono text-xs text-white/80">
                  {doc.name}
                </p>
                <p className="font-mono text-[10px] text-white/40">
                  {formatSize(doc.size)}
                </p>
              </div>

              {/* Progress ou status */}
              {doc.status === 'uploading' && (
                <div className="w-16">
                  <div className="h-1 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${doc.progress}%`,
                        background: 'linear-gradient(90deg, #41e8ff, #8b5cf6)',
                      }}
                    />
                  </div>
                </div>
              )}

              {doc.status === 'done' && (
                <span className="text-neon-cyan">✓</span>
              )}

              <button
                onClick={() => removeDocument(doc.id)}
                className="text-white/40 hover:text-red-400 transition-colors"
                aria-label="Remover"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Analyze button */}
      {state.context.documents.filter((d) => d.status === 'done').length > 0 && (
        <div className="border-t px-4 py-3" style={{ borderColor: 'rgba(65, 232, 255, 0.08)' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAnalyze}
            className="w-full rounded-lg py-2 font-mono text-xs font-medium transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(65, 232, 255, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
              border: '1px solid rgba(65, 232, 255, 0.4)',
            }}
          >
            Analisar com IA 🧠
          </motion.button>
        </div>
      )}
    </div>
  );
}