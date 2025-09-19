import * as cheerio from 'cheerio';

export async function extractContentFromUrl(url: string): Promise<string> {
  try {
    // Validate URL format
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL protocol. Only HTTP and HTTPS are supported.');
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();

    // Try to find main content using common selectors
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '#content',
      '.main-content'
    ];

    let extractedText = '';

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        extractedText = element.text();
        break;
      }
    }

    // Fallback to body content if no main content found
    if (!extractedText) {
      extractedText = $('body').text();
    }

    // Clean up the text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    if (!extractedText || extractedText.length < 100) {
      throw new Error('Unable to extract meaningful content from the URL');
    }

    return extractedText;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Content extraction failed: ${error.message}`);
    }
    throw new Error('Unknown error occurred during content extraction');
  }
}
