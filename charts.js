/**
 * charts.js - Graficos y visualizaciones para Finanzas Denis
 * Usa Chart.js para renderizar graficos
 */

const Charts = {
    COLORS: [
        '#4361ee', '#ff6b6b', '#00c897', '#ffc107', '#a855f7',
        '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1'
    ],

    INCOME_COLORS: [
        '#00c897', '#06b6d4', '#4361ee', '#84cc16', '#a855f7',
        '#ffc107', '#f97316', '#ec4899', '#6366f1', '#ff6b6b'
    ],

    categoryChart: null,
    incomeCategoryChart: null,
    trendChart: null,
    comparisonChart: null,
    currentTheme: 'dark',

    getThemeColors() {
        const isDark = this.currentTheme === 'dark';
        return {
            legendColor: isDark ? '#a0a0b8' : '#555555',
            tooltipBg: isDark ? '#1a1a2e' : '#ffffff',
            tooltipTitle: isDark ? '#e8e8e8' : '#333333',
            tooltipBody: isDark ? '#a0a0b8' : '#666666',
            tooltipBorder: isDark ? '#2a2a4a' : '#e0e0e0',
            gridColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)',
            tickColor: isDark ? '#6c6c80' : '#888888'
        };
    },

    updateThemeColors(theme) {
        this.currentTheme = theme;
        if (this.categoryChart) {
            const settings = Storage.getSettings();
            this.renderCategoryChart(App.currentYear, App.currentMonth);
            this.renderIncomeCategoryChart(App.currentYear, App.currentMonth);
            this.renderTrendChart();
        }
    },

    renderCategoryChart(year, month) {
        const canvas = document.getElementById('chart-categories');
        const emptyMsg = document.getElementById('chart-empty');
        const catTotals = Storage.getCategoryTotals(year, month, 'expense');
        const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
        const tc = this.getThemeColors();

        if (entries.length === 0) {
            canvas.style.display = 'none';
            emptyMsg.classList.remove('hidden');
            if (this.categoryChart) { this.categoryChart.destroy(); this.categoryChart = null; }
            return;
        }

        canvas.style.display = 'block';
        emptyMsg.classList.add('hidden');

        const labels = entries.map(e => e[0]);
        const data = entries.map(e => e[1]);
        const colors = entries.map((_, i) => this.COLORS[i % this.COLORS.length]);

        if (this.categoryChart) this.categoryChart.destroy();

        this.categoryChart = new Chart(canvas, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, spacing: 2 }] },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: tc.legendColor, padding: 12, usePointStyle: true, pointStyleWidth: 10, font: { size: 11 } } },
                    tooltip: { backgroundColor: tc.tooltipBg, titleColor: tc.tooltipTitle, bodyColor: tc.tooltipBody, borderColor: tc.tooltipBorder, borderWidth: 1, padding: 10,
                        callbacks: { label: (ctx) => { const currency = Storage.getSettings().currency; const total = ctx.dataset.data.reduce((a, b) => a + b, 0); const pct = ((ctx.parsed / total) * 100).toFixed(1); return ` ${ctx.label}: ${currency}${ctx.parsed.toFixed(2)} (${pct}%)`; } }
                    }
                }
            }
        });
    },

    renderIncomeCategoryChart(year, month) {
        const canvas = document.getElementById('chart-income-categories');
        const emptyMsg = document.getElementById('chart-income-empty');
        const catTotals = Storage.getCategoryTotals(year, month, 'income');
        const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
        const tc = this.getThemeColors();

        if (entries.length === 0) {
            canvas.style.display = 'none';
            emptyMsg.classList.remove('hidden');
            if (this.incomeCategoryChart) { this.incomeCategoryChart.destroy(); this.incomeCategoryChart = null; }
            return;
        }

        canvas.style.display = 'block';
        emptyMsg.classList.add('hidden');

        const labels = entries.map(e => e[0]);
        const data = entries.map(e => e[1]);
        const colors = entries.map((_, i) => this.INCOME_COLORS[i % this.INCOME_COLORS.length]);

        if (this.incomeCategoryChart) this.incomeCategoryChart.destroy();

        this.incomeCategoryChart = new Chart(canvas, {
            type: 'doughnut',
            data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, spacing: 2 }] },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: tc.legendColor, padding: 12, usePointStyle: true, pointStyleWidth: 10, font: { size: 11 } } },
                    tooltip: { backgroundColor: tc.tooltipBg, titleColor: tc.tooltipTitle, bodyColor: tc.tooltipBody, borderColor: tc.tooltipBorder, borderWidth: 1, padding: 10,
                        callbacks: { label: (ctx) => { const currency = Storage.getSettings().currency; const total = ctx.dataset.data.reduce((a, b) => a + b, 0); const pct = ((ctx.parsed / total) * 100).toFixed(1); return ` ${ctx.label}: ${currency}${ctx.parsed.toFixed(2)} (${pct}%)`; } }
                    }
                }
            }
        });
    },

    renderTrendChart() {
        const canvas = document.getElementById('chart-trend');
        const trend = Storage.getLast6MonthsTrend();
        const currency = Storage.getSettings().currency;
        const tc = this.getThemeColors();

        if (this.trendChart) this.trendChart.destroy();

        this.trendChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: trend.map(m => m.label),
                datasets: [
                    { label: 'Ingresos', data: trend.map(m => m.income), backgroundColor: 'rgba(0, 200, 151, 0.7)', borderRadius: 6, barPercentage: 0.7, categoryPercentage: 0.6 },
                    { label: 'Gastos', data: trend.map(m => m.expense), backgroundColor: 'rgba(255, 107, 107, 0.7)', borderRadius: 6, barPercentage: 0.7, categoryPercentage: 0.6 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false }, ticks: { color: tc.tickColor, font: { size: 11 } } },
                    y: { grid: { color: tc.gridColor }, ticks: { color: tc.tickColor, font: { size: 10 }, callback: (val) => `${currency}${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}` } }
                },
                plugins: {
                    legend: { position: 'top', labels: { color: tc.legendColor, usePointStyle: true, pointStyleWidth: 10, font: { size: 11 }, padding: 16 } },
                    tooltip: { backgroundColor: tc.tooltipBg, titleColor: tc.tooltipTitle, bodyColor: tc.tooltipBody, borderColor: tc.tooltipBorder, borderWidth: 1,
                        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${currency}${ctx.parsed.y.toFixed(2)}` }
                    }
                }
            }
        });
    },

    renderComparisonChart() {
        const canvas = document.getElementById('chart-comparison');
        const trend = Storage.getLast6MonthsTrend();
        const currency = Storage.getSettings().currency;
        const tc = this.getThemeColors();

        if (this.comparisonChart) this.comparisonChart.destroy();

        this.comparisonChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: trend.map(m => m.label),
                datasets: [
                    { label: 'Ingresos', data: trend.map(m => m.income), borderColor: '#00c897', backgroundColor: 'rgba(0, 200, 151, 0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#00c897', pointRadius: 5, pointHoverRadius: 7 },
                    { label: 'Gastos', data: trend.map(m => m.expense), borderColor: '#ff6b6b', backgroundColor: 'rgba(255, 107, 107, 0.1)', fill: true, tension: 0.4, pointBackgroundColor: '#ff6b6b', pointRadius: 5, pointHoverRadius: 7 },
                    { label: 'Balance', data: trend.map(m => m.balance), borderColor: '#4361ee', backgroundColor: 'rgba(67, 97, 238, 0.1)', fill: true, tension: 0.4, borderDash: [5, 5], pointBackgroundColor: '#4361ee', pointRadius: 4, pointHoverRadius: 6 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                scales: {
                    x: { grid: { display: false }, ticks: { color: tc.tickColor, font: { size: 11 } } },
                    y: { grid: { color: tc.gridColor }, ticks: { color: tc.tickColor, font: { size: 10 }, callback: (val) => `${currency}${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}` } }
                },
                plugins: {
                    legend: { position: 'top', labels: { color: tc.legendColor, usePointStyle: true, pointStyleWidth: 10, font: { size: 11 }, padding: 16 } },
                    tooltip: { backgroundColor: tc.tooltipBg, titleColor: tc.tooltipTitle, bodyColor: tc.tooltipBody, borderColor: tc.tooltipBorder, borderWidth: 1,
                        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${currency}${ctx.parsed.y.toFixed(2)}` }
                    }
                }
            }
        });
    }
};
