import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PdfRequest {
  reportId: string;
  html?: string;
  title: string;
  sections?: {
    title: string;
    content: string;
  }[];
  metadata?: {
    author?: string;
    createdAt?: string;
    keywords?: string[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: PdfRequest = await req.json();
    const { reportId, html, title, sections, metadata } = requestData;

    console.log(`[Generate-PDF] Starting: ${title} (${reportId})`);

    // If HTML is not provided, generate from sections
    let htmlContent = html;
    
    if (!htmlContent && sections) {
      htmlContent = generateHtmlFromSections(title, sections, metadata);
    }

    if (!htmlContent) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Option 1: Use an external PDF API service
    // For serverless environments, we recommend using external services:
    // - htmltopdf.app
    // - pdf.co
    // - DocRaptor
    
    // Here we'll use a simple approach with html2pdf API (example)
    // In production, replace with your preferred PDF service
    
    const PDF_API_URL = Deno.env.get('PDF_API_URL');
    const PDF_API_KEY = Deno.env.get('PDF_API_KEY');

    if (PDF_API_URL && PDF_API_KEY) {
      // External PDF API call
      const pdfResponse = await fetch(PDF_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PDF_API_KEY}`
        },
        body: JSON.stringify({
          html: htmlContent,
          options: {
            format: 'A4',
            margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
            printBackground: true
          }
        })
      });

      if (pdfResponse.ok) {
        const pdfBuffer = await pdfResponse.arrayBuffer();
        
        console.log(`[Generate-PDF] Success - ${pdfBuffer.byteLength} bytes`);

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              pdfBase64: btoa(String.fromCharCode(...new Uint8Array(pdfBuffer))),
              filename: `${title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${reportId}.pdf`,
              size: pdfBuffer.byteLength
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: Return HTML for client-side PDF generation
    // Client can use jsPDF, html2canvas, or window.print()
    console.log('[Generate-PDF] No PDF API configured, returning HTML for client-side rendering');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          html: htmlContent,
          filename: `${title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_${reportId}.html`,
          fallback: true,
          message: 'PDF API not configured. Use client-side PDF generation.'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Generate-PDF] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function generateHtmlFromSections(
  title: string, 
  sections: { title: string; content: string }[],
  metadata?: { author?: string; createdAt?: string; keywords?: string[] }
): string {
  const date = metadata?.createdAt 
    ? new Date(metadata.createdAt).toLocaleDateString('ko-KR')
    : new Date().toLocaleDateString('ko-KR');

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.8;
      color: #1a1a1a;
      background: white;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      padding-bottom: 40px;
      border-bottom: 2px solid #e5e5e5;
      margin-bottom: 40px;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 16px;
    }
    
    .header .meta {
      font-size: 14px;
      color: #666;
    }
    
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    .section h2 {
      font-size: 20px;
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e5e5;
    }
    
    .section .content {
      font-size: 15px;
      color: #333;
    }
    
    .section .content p {
      margin-bottom: 12px;
    }
    
    .section .content ul, .section .content ol {
      margin-left: 20px;
      margin-bottom: 12px;
    }
    
    .section .content li {
      margin-bottom: 6px;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <p class="meta">
      ${metadata?.author ? `작성자: ${metadata.author} | ` : ''}
      생성일: ${date}
    </p>
  </div>
  
  ${sections.map(section => `
    <div class="section">
      <h2>${section.title}</h2>
      <div class="content">
        ${formatContent(section.content)}
      </div>
    </div>
  `).join('')}
  
  <div class="footer">
    <p>이 보고서는 AI 기반 분석 시스템에 의해 자동 생성되었습니다.</p>
    <p>© ${new Date().getFullYear()} All Rights Reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

function formatContent(content: string): string {
  // Convert markdown-style content to HTML
  let html = content;
  
  // Convert line breaks to paragraphs
  const paragraphs = html.split('\n\n');
  html = paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    
    // Check for list items
    if (p.startsWith('- ') || p.startsWith('* ')) {
      const items = p.split('\n').map(item => 
        `<li>${item.replace(/^[-*]\s*/, '')}</li>`
      ).join('');
      return `<ul>${items}</ul>`;
    }
    
    // Check for numbered list
    if (/^\d+\.\s/.test(p)) {
      const items = p.split('\n').map(item =>
        `<li>${item.replace(/^\d+\.\s*/, '')}</li>`
      ).join('');
      return `<ol>${items}</ol>`;
    }
    
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
  
  // Bold text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  return html;
}
