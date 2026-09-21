import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const colores = {
  ganancia: '#39ff14',
  gasto: '#ff3939',
  trabajo: '#0077ff'
};

const nombres = {
  ganancia: 'Ganancias',
  gasto: 'Gastos',
  trabajo: 'Trabajos'
};

const FinanzasChart = ({ datos }) => {
  // Prepara los datos agrupados por tipo y mes
  const tipos = ['ganancia', 'gasto', 'trabajo'];
  const datasets = tipos.map(tipo => {
    const dataPorMes = Array(12).fill(0);
    datos.forEach(d => {
      if (d.tipo && d.tipo.toLowerCase() === tipo) {
        const mes = new Date(d.fecha).getMonth();
        dataPorMes[mes] += Number(d.monto);
      }
    });
    return {
      label: nombres[tipo],
      data: dataPorMes,
      backgroundColor: colores[tipo],
      borderColor: '#fff',
      borderWidth: 2,
    };
  });

  const data = {
    labels: meses,
    datasets
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#fff',
          font: { size: 40, weight: 'bold' }
        }
      },
      tooltip: {
        enabled: true,
        bodyFont: { size: 28 },
        titleFont: { size: 32 }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#fff',
          font: { size: 28 }
        },
        grid: {
          color: '#444'
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#fff',
          font: { size: 28 }
        },
        grid: {
          color: '#444'
        }
      }
    }
  };

  return (
    <div style={{
      background: "#111",
      borderRadius: 20,
      padding: 20,
      minWidth: 1500,
      minHeight: 600,
      margin: "60px auto",
      maxWidth: "98vw"
    }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default FinanzasChart;