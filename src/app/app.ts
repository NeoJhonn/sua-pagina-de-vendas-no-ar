import { ChangeDetectorRef, Component, HostListener, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { finalize, take, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

type LinkItem = { label: string; href: string };
type Video = { id: string; title: string; youtubeId: string; links: LinkItem[]; commands: string[]; };
type Section = { key: string; title: string; videos: Video[]; };
type TrainingData = { sections: Section[] };


@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'], // <- corrige 'styleUrl' para 'styleUrls'
})
export class App implements OnInit {
  title = 'Treinamento — Sua página de vendas online';
  currentYear = new Date().getFullYear();
  sidebarOpen = false;

  private WATCHED_KEY = 'lt_watched_videos';
  private COMMENTS_KEY = 'lt_video_comments';
  private ACTIVE_SECTION_KEY = 'lt_active_section';

  loading = true;
  loadError = '';
  watched = new Set<string>();
  comments: Record<string, string> = {};

  sections: Section[] = [];

  activeKey = 'apresentacao';
  activeIndex = 0;
  activeSection!: Section;

  private urlCache = new Map<string, SafeResourceUrl>();

  constructor(
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    private cdr: ChangeDetectorRef   // 👈 injeta o CDR
  ) {}

  ngOnInit() {
    // estado persistido
    try { const raw = localStorage.getItem(this.WATCHED_KEY); if (raw) this.watched = new Set(JSON.parse(raw)); } catch {}
    try { const raw = localStorage.getItem(this.COMMENTS_KEY); if (raw) this.comments = JSON.parse(raw); } catch {}
    try { const saved = localStorage.getItem(this.ACTIVE_SECTION_KEY); if (saved) this.activeKey = saved; } catch {}

    // carrega JSON (garantindo detecção no finalize)
    this.http.get<TrainingData>('assets/training.json').pipe(
      take(1),
      catchError(err => {
        this.loadError = 'Não foi possível carregar os dados do treinamento (assets/training.json).';
        console.error(err);
        return of({ sections: [] } as TrainingData);
      }),
      finalize(() => {
        this.loading = false;
        // força atualização da view (zoneless/SSR/hydration)
        this.cdr.detectChanges();
      })
    ).subscribe((data) => {
      this.sections = (data?.sections ?? []).map(normalizeSection);
      if (!this.sections.some(s => s.key === this.activeKey)) {
        this.activeKey = this.sections[0]?.key ?? '';
      }
      this.setActiveByKey(this.activeKey, false);
      // marca para checagem (se estiver em OnPush isso ajuda)
      this.cdr.markForCheck();
    });
  }

  /** URL segura para iframe do YouTube */
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
    this.activeKey = this.sections[this.activeIndex]?.key ?? '';
    this.activeSection = this.sections[this.activeIndex];

    try { localStorage.setItem(this.ACTIVE_SECTION_KEY, this.activeKey); } catch {}
    if (scrollTop) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  selectSection(key: string) {
    if (key !== this.activeKey) this.setActiveByKey(key);
    this.sidebarOpen = false;
  }

  toggleSidebar() { this.sidebarOpen = !this.sidebarOpen; }

  markWatched(videoId: string) {
    if (!this.watched.has(videoId)) {
      this.watched.add(videoId);
      this.persistWatched();
      this.cdr.markForCheck();
    }
  }
  resetWatched(videoId: string) {
    if (this.watched.has(videoId)) {
      this.watched.delete(videoId);
      this.persistWatched();
      this.cdr.markForCheck();
    }
  }
  isWatched(videoId: string) { return this.watched.has(videoId); }

  updateComment(videoId: string, value: string) {
    this.comments[videoId] = value;
    this.persistComments();
    this.cdr.markForCheck();
  }

  private persistWatched() {
    try { localStorage.setItem(this.WATCHED_KEY, JSON.stringify([...this.watched])); } catch {}
  }
  private persistComments() {
    try { localStorage.setItem(this.COMMENTS_KEY, JSON.stringify(this.comments)); } catch {}
  }

  // Ir para home ao clicar no título
  goHome() {
    this.selectSection('apresentacao'); // volta para a seção inicial
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  @HostListener('window:resize')
  onResize() { if (window.innerWidth >= 1024) this.sidebarOpen = false; }
}

/** helpers */
function normalizeSection(s: Section): Section {
  const videos = (s.videos ?? []).map(v => ({
    id: v.id ?? cryptoId(),
    title: v.title ?? 'Aula',
    youtubeId: v.youtubeId ?? 'dQw4w9WgXcQ',
    links: (v.links ?? []).map(l => ({ label: l.label ?? 'Link', href: l.href ?? '#' })),
    commands: v.commands ?? []
  }));
  return { key: s.key, title: s.title, videos };
}
function cryptoId() { return 'vid-' + Math.random().toString(36).slice(2, 9); }


