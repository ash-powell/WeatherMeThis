import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';
import { of } from 'rxjs';

import { App } from './app';
import { ReportEditorStore } from './reports/state/report-editor-store';
import { DialogService } from './shared/application/dialog.service';

describe('App', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isLoading$: of(false),
            isAuthenticated$: of(false),
            user$: of(null),
            error$: of(null),
            loginWithRedirect: () => of(undefined),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should show the gallery destination in the editor', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Public Gallery');
    expect(compiled.textContent).not.toContain('Story Editor');
  });

  it('opens saved stories in a modal and displays the retrieved stories', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
    app.openSavedReports();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Loading saved stories...');

    const request = http.expectOne((candidate) => candidate.url.endsWith('/reports'));
    request.flush([
      {
        _id: 'saved-story-1',
        name: 'Raleigh Weather',
        charts: [],
        createdAt: '2026-09-17T12:00:00.000Z',
        isPublic: false,
        publishedAt: null,
        likeCount: 0,
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Raleigh Weather');
    http.verify();
  });

  it('shows Get Data progress and confirms that the chart was built', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const store = TestBed.inject(ReportEditorStore);
    const dialogs = TestBed.inject(DialogService);
    const http = TestBed.inject(HttpTestingController);
    const chart = prepareWeatherChart(store);

    fixture.detectChanges();
    app.getWeatherData(chart.chartId);
    fixture.detectChanges();

    expect(dialogs.dialog()?.message).toBe('Retrieving data...');
    expect(dialogs.dialog()?.confirmLabel).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Retrieving data...');

    const request = http.expectOne((candidate) => candidate.url.endsWith('/weather'));
    request.flush([{ date: 'all', value: 72 }]);

    expect(dialogs.dialog()?.message).toBe('Chart is ready!');
    expect(dialogs.dialog()?.autoCloseMs).toBe(1000);
    expect(store.report().charts[0].graphSeries).toHaveLength(1);
    http.verify();
    dialogs.close();
  });

  it('automatically closes a temporary success modal after one second', () => {
    vi.useFakeTimers();
    const dialogs = new DialogService();

    dialogs.showTemporary('Chart is ready!', 'Weather data', 1000);

    vi.advanceTimersByTime(999);
    expect(dialogs.dialog()?.message).toBe('Chart is ready!');
    vi.advanceTimersByTime(1);
    expect(dialogs.dialog()).toBeNull();
  });

  it('shows the provider-specific message returned for an Open-Meteo failure', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const store = TestBed.inject(ReportEditorStore);
    const dialogs = TestBed.inject(DialogService);
    const http = TestBed.inject(HttpTestingController);
    const chart = prepareWeatherChart(store);

    fixture.detectChanges();
    app.getWeatherData(chart.chartId);

    const request = http.expectOne((candidate) => candidate.url.endsWith('/weather'));
    request.flush(
      {
        error: 'Unable to connect to Open-Meteo. Please try again shortly.',
      },
      {
        status: 502,
        statusText: 'Bad Gateway',
      },
    );

    expect(dialogs.dialog()?.message).toBe(
      'Unable to connect to Open-Meteo. Please try again shortly.',
    );
    expect(dialogs.dialog()?.confirmLabel).toBe('Close');
    http.verify();
  });
});

function prepareWeatherChart(store: ReportEditorStore) {
  const chart = store.report().charts[0];

  store.updateChart(chart.chartId, (current) => ({
    ...current,
    groupBy: 'all',
  }));
  store.updateSeries(chart.chartId, chart.seriesInputs[0].seriesId, (series) => ({
    ...series,
    city: 'Raleigh',
    country: 'United States',
    latitude: 35.7796,
    longitude: -78.6382,
    measurement: 'temperature_2m_max',
    aggregation: 'max',
    avgFrequency: 'none',
    comparison: 'none',
    threshold: null,
  }));

  return store.report().charts[0];
}
