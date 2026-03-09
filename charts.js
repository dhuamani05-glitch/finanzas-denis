/**
 * charts.js - Graficos y visualizaciones para Finanzas Denis
 * Usa Chart.js para renderizar graficos
 */

const Charts = {
    COLORS: [
        '#4361ee', '#ff6b6b', '#00c897', '#ffc107', '#a855f7',
        '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1'
    ],

    categoryChart: null,
    trendChart: null,
    comparisonChart: null,

    // ===== Grafico de torta: Gastos por Categoria =====
    renderCategoryChart(year, month) {
        const canvas = document.getElementById('chart-categories');
        const emptyMsg = document.getElementById('chart-empty');
        const catTotals = Storage.getCategoryTotals(year, month, 'expense');
        const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

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
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    spacing: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#a0a0b8',
                            padding: 12,
                            usePointStyle: true,
                            pointStyleWidth: 10,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1a1a2e',
                        titleColor: '#e8e8e8',
                        bodyColor: '#a0a0b8',
                        borderColor: '#2a2a4a',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: (ctx) => {
                                const currency = Storage.getSettings().currency;
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((ctx.parsed / total) * 100).toFixed(1);
                                return ` ${ctx.label}: ${currency}${ctx.parsed.toFixed(2)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    // ===== Grafico de barras: Tendencia Mensual =====
    renderTrendChart() {
        const canvas = document.getElementById('chart-trend');
        const trend = Storage.getLast6MonthsTrend();
        const currency = Storage.getSettings().currency;

        if (this.trendChart) this.trendChart.destroy();

        this.trendChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: trend.map(m => m.label),
                datasets: [
                    {
                        label: 'Ingresos',
                        data: trend.map(m => m.income),
                        backgroundColor: 'rgba(0, 200, 151, 0.7)',
                        borderRadius: 6,
                        barPercentage: 0.7,
                        categoryPercentage: 0.6
                    },
                    {
                        label: 'Gastos',
                        data: trend.map(m => m.expense),
                        backgroundColor: 'rgba(255, 107, 107, 0.7)',
                        borderRadius: 6,
                        barPercentage: 0.7,
                        categoryPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#6c6c80', font: { size: 11 } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: {
                            color: '#6c6c80',
                            font: { size: 10 },
                            callback: (val) => `${currency}${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#a0a0b8',
                            usePointStyle: true,
                            pointStyleWidth: 10,
                            font: { size: 11 },
                            padding: 16
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1a1a2e',
                        titleColor: '#e8e8e8',
                        bodyColor: '#a0a0b8',
                        borderColor: '#2a2a4a',
                        borderWidth: 1,
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${currency}${ctx.parsed.y.toFixed(2)}`
                        }
                    }
                }
            }
        });
    },

    // ===== Grafico de linea: Comparativa Mensual (Reportes) =====
    renderComparisonChart() {
        const canvas = document.getElementById('chart-comparison');
        const trend = Storage.getLast6MonthsTrend();
        const currency = Storage.getSettings().currency;

        if (this.comparisonChart) this.comparisonChart.destroy();

        this.comparisonChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: trend.map(m => m.label),
                datasets: [
                    {
                        label: 'Ingresos',
                        data: trend.map(m => m.income),
                        borderColor: '#00c897',
                        backgroundColor: 'rgba(0, 200, 151, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#00c897',
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Gastos',
                        data: trend.map(m => m.expense),
                        borderColor: '#ff6b6b',
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#ff6b6b',
                        pointRadius: 5,
                        pointHoverRadius: 7
                    },
                    {
                        label: 'Balance',
                        data: trend.map(m => m.balance),
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderDash: [5, 5],
                        pointBackgroundColor: '#4361ee',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#6c6c80', font: { size: 11 } }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: {
                            color: '#6c6c80',
                            font: { size: 10 },
                            callback: (val) => `${currency}${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#a0a0b8',
                            usePointStyle: true,
                            pointStyleWidth: 10,
                            font: { size: 11 },
                            padding: 16
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1a1a2e',
                        titleColor: '#e8e8e8',
                        bodyColor: '#a0a0b8',
                        borderColor: '#2a2a4a',
                        borderWidth: 1,
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${currency}${ctx.parsed.y.toFixed(2)}`
                        }
                    }
                }
            }
        });
    }
};
