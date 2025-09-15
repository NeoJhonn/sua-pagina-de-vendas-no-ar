import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HostListener } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type LinkItem = { label: string; href: string };
type Video = {
  id: string;
  title: string;
  youtubeId: string;
  links: LinkItem[];
  commands: string[];
};

type Section = {
  key: string;
  title: string;
  videos: Video[];
};

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
   title = 'Treinamento — Sua página de vendas online';
  currentYear = new Date().getFullYear();
  sidebarOpen = false;

  private WATCHED_KEY = 'lt_watched_videos';
  private COMMENTS_KEY = 'lt_video_comments';
  private ACTIVE_SECTION_KEY = 'lt_active_section';

  watched = new Set<string>();
  comments: Record<string, string> = {};

  sections: Section[] = [
    { key: 'apresentacao', title: 'Apresentação', videos: makeFive('APRES', 'Apresentação') },
    { key: 'ambiente', title: 'Configurando Ambiente', videos: makeFive('AMB', 'Configurando Ambiente') },
    { key: 'github', title: 'Subir projeto no Github', videos: makeFive('GH', 'Subir projeto no Github') },
    { key: 'gerar-pagina', title: 'Gerando sua Página', videos: makeFive('GERAR', 'Gerando sua Página') },
    { key: 'vercel', title: 'Sua página online com o Vercel', videos: makeFive('VERCEL', 'Deploy no Vercel') },
    { key: 'dominio', title: 'Bônus: Comprar e configurar domínio próprio', videos: makeFive('DNS', 'Domínio próprio') },
  ];

  /** índice/objeto da seção ativa — estáveis (sem getter) */
  activeKey = 'apresentacao';
  activeIndex = 0;
  activeSection!: Section;

  // 🔑 cache para URLs seguras
  private urlCache = new Map<string, SafeResourceUrl>();

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    try {
      const raw = localStorage.getItem(this.WATCHED_KEY);
      if (raw) this.watched = new Set(JSON.parse(raw));
    } catch {}

    try {
      const raw = localStorage.getItem(this.COMMENTS_KEY);
      if (raw) this.comments = JSON.parse(raw);
    } catch {}

    try {
      const saved = localStorage.getItem(this.ACTIVE_SECTION_KEY);
      if (saved && this.sections.some(s => s.key === saved)) this.activeKey = saved;
    } catch {}

    // inicializa ponteiro estável da seção ativa
    this.setActiveByKey(this.activeKey, false);
  }

  /** Gera uma URL segura para o iframe */
  videoUrl(youtubeId: string): SafeResourceUrl {
    const key = `yt:${youtubeId}`;
    const cached = this.urlCache.get(key);
    if (cached) return cached;

    const safe = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${youtubeId}?rel=0`
    );
    this.urlCache.set(key, safe);
    return safe;
  }

  private setActiveByKey(key: string, scrollTop = true) {
    const idx = this.sections.findIndex(s => s.key === key);
    this.activeIndex = idx >= 0 ? idx : 0;
    this.activeKey = this.sections[this.activeIndex].key;
    this.activeSection = this.sections[this.activeIndex];

    try {
      localStorage.setItem(this.ACTIVE_SECTION_KEY, this.activeKey);
    } catch {}

    if (scrollTop) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  selectSection(key: string) {
    if (key !== this.activeKey) this.setActiveByKey(key);
    this.sidebarOpen = false;
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  markWatched(videoId: string) {
    if (!this.watched.has(videoId)) {
      this.watched.add(videoId);
      this.persistWatched();
    }
  }

  resetWatched(videoId: string) {
    if (this.watched.has(videoId)) {
      this.watched.delete(videoId);
      this.persistWatched();
    }
  }

  isWatched(videoId: string) {
    return this.watched.has(videoId);
  }

  updateComment(videoId: string, value: string) {
    this.comments[videoId] = value;
    this.persistComments();
  }

  private persistWatched() {
    try {
      localStorage.setItem(this.WATCHED_KEY, JSON.stringify([...this.watched]));
    } catch {}
  }

  private persistComments() {
    try {
      localStorage.setItem(this.COMMENTS_KEY, JSON.stringify(this.comments));
    } catch {}
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth >= 1024) this.sidebarOpen = false;
  }
}

/** Gera 5 vídeos com dados próprios */
function makeFive(prefix: string, baseTitle: string): Video[] {
  const yids = ['dQw4w9WgXcQ', 'M7lc1UVf-VE', 'ysz5S6PUM-U', '9bZkp7q19f0', '3GwjfUFyY6M'];
  return Array.from({ length: 5 }).map((_, i) => {
    const aula = i + 1;
    return {
      id: `${prefix}-V${aula}`,
      title: `${baseTitle} — Aula ${aula}`,
      youtubeId: yids[i],
      links: [
        { label: `Materiais da Aula ${aula}`, href: `https://seu-dominio.com/aulas/${prefix.toLowerCase()}-${aula}` },
        { label: 'Angular Docs', href: 'https://angular.dev' },
        { label: 'Tailwind Docs', href: 'https://tailwindcss.com/docs' },
      ],
      commands: exampleCommands(prefix, aula),
    };
  });
}

function exampleCommands(prefix: string, aula: number): string[] {
  switch (aula) {
    case 1: return ['npm install -g @angular/cli', 'ng version', 'node -v && npm -v'];
    case 2: return ['ng new minha-pagina --style=css --routing', 'cd minha-pagina', 'npm i -D tailwindcss postcss autoprefixer'];
    case 3: return ['git init', `git remote add origin git@github.com:SEUUSER/${prefix}-repo.git`, 'git add . && git commit -m "feat: projeto base"'];
    case 4: return ['ng serve -o', 'ng build', 'npx vercel'];
    case 5: return ['npx vercel deploy --prod', 'vercel env pull .env', 'vercel logs'];
    default: return [];
  }
}

