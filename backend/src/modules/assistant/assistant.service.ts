import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AssistantTask = 'atelier' | 'presentation' | 'produit' | 'reponse' | 'devis' | 'whatsapp' | 'bio' | 'siarc' | 'correction' | 'traduction';

const TASK_INSTRUCTIONS: Record<AssistantTask, string> = {
  atelier: 'Rédige une description chaleureuse et concrète de l’atelier, ses savoir-faire, sa ville et ses matières.',
  presentation: 'Rédige une présentation professionnelle courte de l’artisan ou de la structure.',
  produit: 'Rédige une fiche produit claire avec titre, description, usages, matières, dimensions si disponibles et appel à l’action.',
  reponse: 'Rédige une réponse polie et professionnelle à un client, avec un ton naturel adapté à WhatsApp.',
  devis: 'Rédige un devis simple en FCFA avec prestation, quantité, prix, délai, validité et conditions. N’invente pas les informations absentes : utilise [à préciser].',
  whatsapp: 'Rédige un message WhatsApp court, humain et vendeur, sans langage trop commercial.',
  bio: 'Rédige une bio artisan courte pour un profil social, avec métier, ville, spécialité et invitation à contacter.',
  siarc: 'Rédige un texte de présentation adapté à un dossier ou stand SIARC, mettant en valeur le savoir-faire camerounais.',
  correction: 'Corrige l’orthographe, la grammaire et la ponctuation sans changer le sens ni le ton.',
  traduction: 'Traduis fidèlement entre français et anglais. Retourne uniquement le texte traduit.',
};

@Injectable()
export class AssistantService {
  constructor(private readonly config: ConfigService) {}

  async generate(input: { task: AssistantTask; input: string; language?: 'fr' | 'en'; context?: string }) {
    if (!TASK_INSTRUCTIONS[input.task]) throw new BadRequestException('Type de contenu inconnu');
    const language = input.language ?? 'fr';
    const apiKey = this.config.get<string>('AI_API_KEY');
    if (!apiKey) return { content: this.fallback(input.task, input.input, language), provider: 'local' as const };

    const baseUrl = (this.config.get<string>('AI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = this.config.get<string>('AI_MODEL') || 'gpt-4o-mini';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          { role: 'system', content: `Tu es l’assistant IA ArtisanConnect, spécialisé dans l’artisanat camerounais. ${TASK_INSTRUCTIONS[input.task]} Réponds en ${language === 'en' ? 'anglais' : 'français'}. Sois concret, honnête et adapté aux petits budgets. N’invente jamais un prix, une certification ou une information absente.` },
          { role: 'user', content: `${input.context ? `Contexte : ${input.context}\n\n` : ''}${input.input}` },
        ],
      }),
    });
    if (!response.ok) throw new BadRequestException('Le service IA est momentanément indisponible');
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new BadRequestException('Le service IA n’a produit aucun texte');
    return { content, provider: 'ai' as const };
  }

  private fallback(task: AssistantTask, input: string, language: 'fr' | 'en') {
    if (language === 'en') return `ArtisanConnect assistant draft\n\n${input}\n\nPlease adapt this text with your exact prices, location and delivery details.`;
    const labels: Record<AssistantTask, string> = { atelier: 'Description de l’atelier', presentation: 'Présentation professionnelle', produit: 'Fiche produit', reponse: 'Réponse client', devis: 'Devis simple', whatsapp: 'Message WhatsApp', bio: 'Bio artisan', siarc: 'Présentation SIARC', correction: 'Texte corrigé', traduction: 'Traduction' };
    return `${labels[task]}\n\n${input}\n\nAdaptez ce brouillon avec vos prix, votre ville et vos délais réels.`;
  }
}
