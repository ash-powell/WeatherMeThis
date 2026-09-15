import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeatherChart } from './weather-chart';

describe('WeatherChart', () => {
  let component: WeatherChart;
  let fixture: ComponentFixture<WeatherChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeatherChart],
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to a line chart', () => {
    expect(component.chartType()).toBe('line');
  });

  it('should accept a bar chart type', () => {
    fixture.componentRef.setInput('chartType', 'bar');

    expect(component.chartType()).toBe('bar');
  });
});
