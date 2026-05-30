import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export type UpdatePhase = 'idle' | 'in_progress' | 'success' | 'failed';

export interface StackVersionInfo {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  latestNotes: string | null;
  latestUrl: string | null;
  publishedAt: string | null;
}

export interface UpdateStatus {
  status: UpdatePhase;
  startedAt: string | null;
  finishedAt: string | null;
  log: string;
}

interface LatestRelease {
  version: string;
  notes: string | null;
  url: string | null;
  publishedAt: string | null;
}

interface GithubRelease {
  tag_name: string;
  body?: string | null;
  html_url?: string;
  draft?: boolean;
  published_at?: string | null;
}

const RELEASE_CACHE_MS = 5 * 60 * 1000;

/**
 * Self-update механизм серверного стека. Источник релизов — публичный GitHub
 * (репозиторий проекта), доставка — образы GHCR. Применение делает sidecar
 * `updater`: backend пишет файл-триггер в общий volume (`UPDATE_IPC_DIR`),
 * updater видит его и выполняет `docker compose pull && up -d backend admin`.
 *
 * Backend пишет ТОЛЬКО `trigger`; статус/лог пишет updater (root), backend их
 * лишь читает — так нет конфликта владельца файлов между контейнерами.
 */
@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  private readonly ipcDir = process.env['UPDATE_IPC_DIR'] ?? '/ipc';
  private readonly repo = process.env['GITHUB_REPO'] ?? 'TrojanDll/curier-app';
  private readonly current = process.env['STACK_VERSION'] ?? 'dev';

  private latestCache: { at: number; data: LatestRelease | null } | null = null;

  async getVersionInfo(force = false): Promise<StackVersionInfo> {
    const latest = await this.fetchLatestStackRelease(force);
    return {
      current: this.current,
      latest: latest?.version ?? null,
      updateAvailable: latest ? isNewer(latest.version, this.current) : false,
      latestNotes: latest?.notes ?? null,
      latestUrl: latest?.url ?? null,
      publishedAt: latest?.publishedAt ?? null,
    };
  }

  async triggerUpdate(): Promise<{ started: boolean; status: UpdatePhase }> {
    const phase = await this.readPhase();
    const pending = await this.fileExists('trigger');
    if (phase === 'in_progress' || pending) {
      return { started: false, status: 'in_progress' };
    }
    await fs.mkdir(this.ipcDir, { recursive: true });
    // Содержимое триггера updater-ом игнорируется (действие фиксированное).
    await fs.writeFile(
      path.join(this.ipcDir, 'trigger'),
      `${new Date().toISOString()}\n`,
      'utf8',
    );
    return { started: true, status: 'in_progress' };
  }

  async getUpdateStatus(): Promise<UpdateStatus> {
    const [statusRaw, startedAt, finishedAt, log, pending] = await Promise.all([
      this.readFile('status'),
      this.readFile('started_at'),
      this.readFile('finished_at'),
      this.readFile('log'),
      this.fileExists('trigger'),
    ]);
    let phase = (statusRaw?.trim() as UpdatePhase) || 'idle';
    if (!['idle', 'in_progress', 'success', 'failed'].includes(phase)) {
      phase = 'idle';
    }
    // Триггер уже лежит, но updater ещё не подхватил → показываем как идущее.
    if (pending && phase !== 'in_progress') phase = 'in_progress';
    return {
      status: phase,
      startedAt: startedAt?.trim() || null,
      finishedAt: finishedAt?.trim() || null,
      log: (log ?? '').slice(-8000),
    };
  }

  private async readPhase(): Promise<UpdatePhase> {
    const s = (await this.readFile('status'))?.trim();
    return (s as UpdatePhase) || 'idle';
  }

  private async readFile(name: string): Promise<string | null> {
    try {
      return await fs.readFile(path.join(this.ipcDir, name), 'utf8');
    } catch {
      return null;
    }
  }

  private async fileExists(name: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.ipcDir, name));
      return true;
    } catch {
      return false;
    }
  }

  private async fetchLatestStackRelease(
    force = false,
  ): Promise<LatestRelease | null> {
    // `force` — ручная кнопка «Проверить обновления» обходит кэш и всегда
    // ходит в GitHub. Фоновый поллинг (каждые 15 мин) остаётся кэшированным,
    // так лимит анонимного GitHub API (60 req/ч/IP) не страдает.
    if (
      !force &&
      this.latestCache &&
      Date.now() - this.latestCache.at < RELEASE_CACHE_MS
    ) {
      return this.latestCache.data;
    }
    try {
      const res = await fetch(
        `https://api.github.com/repos/${this.repo}/releases?per_page=30`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'curier-self-update',
          },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!res.ok) {
        this.logger.warn(`GitHub releases fetch failed: HTTP ${res.status}`);
        return this.latestCache?.data ?? null;
      }
      const releases = (await res.json()) as GithubRelease[];
      const stack =
        releases
          .filter(
            (r) =>
              !r.draft &&
              typeof r.tag_name === 'string' &&
              r.tag_name.startsWith('stack-v'),
          )
          .map<LatestRelease>((r) => ({
            version: r.tag_name.replace(/^stack-v/, ''),
            notes: r.body ?? null,
            url: r.html_url ?? null,
            publishedAt: r.published_at ?? null,
          }))
          .sort((a, b) => compareVersions(b.version, a.version))[0] ?? null;
      this.latestCache = { at: Date.now(), data: stack };
      return stack;
    } catch (e) {
      this.logger.warn(`GitHub releases fetch error: ${String(e)}`);
      return this.latestCache?.data ?? null;
    }
  }
}

function parseParts(v: string): number[] {
  return v.split('.').map((x) => parseInt(x, 10) || 0);
}

function compareVersions(a: string, b: string): number {
  const pa = parseParts(a);
  const pb = parseParts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

function isNewer(candidate: string, current: string): boolean {
  // dev/local образ → считаем любую опубликованную версию новее.
  if (current === 'dev') return true;
  return compareVersions(candidate, current) > 0;
}
