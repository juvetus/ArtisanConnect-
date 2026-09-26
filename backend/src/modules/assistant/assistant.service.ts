import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiImageGeneration } from '../../entities/index.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

export type AssistantTask = 'atelier' | 'presentation' | 'profil' | 'produit' | 'reponse' | 'devis' | 'whatsapp' | 'bio' | 'siarc' | 'correction' | 'traduction';

export interface ArtisanPhotoAnalysis {
  probableTrade: string;
  qualityScore: number;
  issues: string[];
  recommendations: string[];
  tradeCoherence: 'coherent' | 'uncertain' | 'incoherent';
  authenticityAssessment: 'not_verifiable_from_image_alone';
  optimizedCaption: string;
  limitations: string;
  provider: 'ai';
}

const TASK_INSTRUCTIONS: Record<AssistantTask, string> = {
  atelier: 'Rédige une description chaleureuse et concrète de l’atelier, ses savoir-faire, sa ville et ses matières.',
  presentation: 'Rédige une présentation professionnelle courte de l’artisan ou de la structure.',
  profil: 'Crée un pack de profil artisan avec les sections suivantes : 1) description professionnelle claire et vendeuse de 150 mots maximum, 2) liste structurée des services proposés, 3) conseils de prix prudents en FCFA en expliquant les facteurs qui les font varier et sans inventer de tarifs locaux, 4) réponse automatique WhatsApp polie et professionnelle, 5) mini-texte pour réseaux sociaux. Utilise seulement les informations fournies; signale les informations manquantes par [à préciser]. Ton professionnel, simple et adapté au Cameroun.',
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
  constructor(
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectRepository(AiImageGeneration) private readonly aiImageGenerationRepository: Repository<AiImageGeneration>,
  ) {}

  async generateImage(input: { userId: string; prompt: string; style?: string; language?: 'fr' | 'en'; referenceImage?: Express.Multer.File }) {
    const quota = await this.subscriptionsService.getAiImageQuota(input.userId);
    if (!quota.subscriptionId || quota.limit === 0) throw new BadRequestException('La génération d’images IA est réservée aux abonnements payants.');
    if (quota.remaining <= 0) throw new BadRequestException(`Votre quota d’images IA est épuisé (${quota.used}/${quota.limit}). Renouvelez ou changez de plan pour continuer.`);
    const prompt = input.prompt.trim();
    if (prompt.length < 20 && !input.referenceImage) throw new BadRequestException('Ajoutez une description d’au moins 20 caractères ou une photo réelle du produit.');
    if (prompt.length > 800) throw new BadRequestException('La description est limitée à 800 caractères.');
    const blocked = /\b(logo|marque|brand|nike|gucci|arme|weapon|pistolet|fusil|personne réelle|real person|deepfake)\b/i;
    if (blocked.test(prompt)) throw new BadRequestException('Cette demande ne peut pas être générée. Décrivez uniquement un produit ou une mise en scène sans marque ni personne identifiable.');
    if (!this.storage.isEnabled()) throw new BadRequestException('Le stockage Cloudinary doit être configuré pour générer une image.');
    const apiKey = this.config.get<string>('AI_API_KEY');
    if (!apiKey) throw new BadRequestException('La génération d’images IA n’est pas encore configurée.');
    const baseUrl = (this.config.get<string>('AI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = this.config.get<string>('AI_IMAGE_MODEL') || 'gpt-image-1';
    const style = input.style || 'studio';
    const productDescription = prompt || 'the product shown in the reference image';
    const generatedPrompt = `Create a product staging image, not a proof of a real artisan work. Style: ${style}. Product description: ${productDescription}. Preserve the main product shape and materials from the reference image when provided. No people, no logos, no brands, no text in the image. The result must be suitable for a marketplace product listing and clearly represent an inspiration or staging scene.`;
    const response = input.referenceImage
      ? await this.generateImageEdit(baseUrl, apiKey, model, generatedPrompt, input.referenceImage)
      : await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: generatedPrompt, size: '1024x1024' }),
      });
    if (!response.ok) throw new BadRequestException('Le service de génération d’images est momentanément indisponible.');
    const data = await response.json() as { data?: Array<{ url?: string; b64_json?: string }> };
    const generated = data.data?.[0];
    if (!generated?.url && !generated?.b64_json) throw new BadRequestException('Le service IA n’a produit aucune image.');
    const buffer = generated.b64_json ? Buffer.from(generated.b64_json, 'base64') : Buffer.from(await (await fetch(generated.url!)).arrayBuffer());
    const upload = await this.storage.uploadBuffer(buffer, 'artisanconnect/listings/ai', 'image');
    await this.aiImageGenerationRepository.save(this.aiImageGenerationRepository.create({ userId: input.userId, subscriptionId: quota.subscriptionId, }));
    return { imageUrl: upload.url, label: 'Image IA — mise en scène / inspiration', quota: { used: quota.used + 1, limit: quota.limit, remaining: quota.remaining - 1 } };
  }

  getImageQuota(userId: string) {
    return this.subscriptionsService.getAiImageQuota(userId);
  }

  private async generateImageEdit(baseUrl: string, apiKey: string, model: string, prompt: string, referenceImage: Express.Multer.File) {
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', prompt);
    form.append('size', '1024x1024');
    const imageBytes = new Uint8Array(referenceImage.buffer);
    form.append('image', new Blob([imageBytes], { type: referenceImage.mimetype }), referenceImage.originalname || 'reference.png');
    return fetch(`${baseUrl}/images/edits`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  }

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

  async analyzeArtisanPhoto(image: Express.Multer.File, declaredTrade: string, language: 'fr' | 'en' = 'fr'): Promise<ArtisanPhotoAnalysis> {
    const apiKey = this.config.get<string>('AI_API_KEY');
    if (!apiKey) throw new BadRequestException('L’analyse photo nécessite la configuration de AI_API_KEY.');

    const baseUrl = (this.config.get<string>('AI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = this.config.get<string>('AI_MODEL') || 'gpt-4o-mini';
    const imageData = image.buffer.toString('base64');
    const languageName = language === 'en' ? 'English' : 'French';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `Analyze this artisan portfolio photo and return only a JSON object in ${languageName} with keys: probableTrade (string), qualityScore (integer 0-100), issues (array of short strings), recommendations (array of practical short strings), tradeCoherence ("coherent"|"uncertain"|"incoherent"), authenticityAssessment (always "not_verifiable_from_image_alone"), optimizedCaption (string), limitations (string). Assess only visible photo quality and whether the pictured work seems consistent with the given trade when supplied. Never claim the image is stolen, authentic, or proof of the artisan's work; pixels alone cannot establish ownership or provenance. Be respectful and constructive.`,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Analyze the attached artisan portfolio photo. Artisan-declared trade: ${declaredTrade.trim().slice(0, 100) || 'not provided'}. Do not infer ownership.` },
              { type: 'image_url', image_url: { url: `data:${image.mimetype};base64,${imageData}`, detail: 'high' } },
            ],
          },
        ],
      }),
    });
    if (!response.ok) throw new BadRequestException('Le service d’analyse photo est momentanément indisponible.');
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new BadRequestException('Le service IA n’a produit aucune analyse.');
    try {
      const parsed = JSON.parse(content) as Partial<ArtisanPhotoAnalysis>;
      if (
        typeof parsed.probableTrade !== 'string' ||
        typeof parsed.qualityScore !== 'number' ||
        !Number.isFinite(parsed.qualityScore) ||
        !Array.isArray(parsed.issues) ||
        !Array.isArray(parsed.recommendations) ||
        !['coherent', 'uncertain', 'incoherent'].includes(parsed.tradeCoherence ?? '') ||
        typeof parsed.optimizedCaption !== 'string' ||
        typeof parsed.limitations !== 'string'
      ) throw new Error('Invalid photo analysis shape');
      return {
        probableTrade: parsed.probableTrade.slice(0, 120),
        qualityScore: Math.max(0, Math.min(100, Math.round(parsed.qualityScore))),
        issues: parsed.issues.filter((item): item is string => typeof item === 'string').slice(0, 8),
        recommendations: parsed.recommendations.filter((item): item is string => typeof item === 'string').slice(0, 8),
        tradeCoherence: parsed.tradeCoherence as ArtisanPhotoAnalysis['tradeCoherence'],
        authenticityAssessment: 'not_verifiable_from_image_alone',
        optimizedCaption: parsed.optimizedCaption.slice(0, 500),
        limitations: parsed.limitations.slice(0, 500),
        provider: 'ai',
      };
    } catch {
      throw new BadRequestException('Le résultat d’analyse photo est invalide.');
    }
  }

  private fallback(task: AssistantTask, input: string, language: 'fr' | 'en') {
    if (language === 'en') return `ArtisanConnect assistant draft\n\n${input}\n\nPlease adapt this text with your exact prices, location and delivery details.`;
    const labels: Record<AssistantTask, string> = { atelier: 'Description de l’atelier', presentation: 'Présentation professionnelle', profil: 'Pack de profil artisan', produit: 'Fiche produit', reponse: 'Réponse client', devis: 'Devis simple', whatsapp: 'Message WhatsApp', bio: 'Bio artisan', siarc: 'Présentation SIARC', correction: 'Texte corrigé', traduction: 'Traduction' };
    return `${labels[task]}\n\n${input}\n\nAdaptez ce brouillon avec vos prix, votre ville et vos délais réels.`;
  }
}
