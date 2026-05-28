package graph;

import org.knowm.xchart.BitmapEncoder;
import org.knowm.xchart.XYChart;
import org.knowm.xchart.XYChartBuilder;
import org.knowm.xchart.style.Styler;

import java.awt.*;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.text.DecimalFormatSymbols;
import java.util.List;
import java.util.*;
import java.util.stream.Collectors;

public class QueueLinePlot {

    public static void main(String[] args) throws IOException {
        // Caminho do arquivo CSV a ser lido
        String csvPath = "queue_time.csv"; // ou "drop_probability.csv"


        while (true) {

            // Lê os dados do CSV e organiza por número de drones
            Map<Integer, List<Double[]>> droneData = loadData(csvPath);

            // Gera o gráfico a partir dos dados carregados
            generateGraph(
                    droneData,
                    "Arrival Rate (AR)",         // Nome do eixo X
                    "Mean Queue Time",         // Nome do eixo Y
                    "ms",                        // Unidade do eixo Y
                    "queue_time_graph",        // Nome do arquivo de saída (sem extensão)
                    "./",                        // Caminho base de saída
                    "graphs"                     // Subpasta para salvar os gráficos
            );
            try {
                Thread.sleep(5000);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }

    /**
     * Lê o CSV e transforma em um mapa com os dados organizados por número de drones.
     */
    public static Map<Integer, List<Double[]>> loadData(String filePath) throws IOException {
        Map<Integer, List<Double[]>> dataMap = new TreeMap<>();
        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {
            String line;
            boolean firstLine = true;

            while ((line = br.readLine()) != null) {
                if (firstLine) {
                    firstLine = false;
                    continue; // pula o cabeçalho
                }

                String[] parts = line.split(";");
                if (parts.length < 4) continue;

                double ar = Double.parseDouble(parts[0].trim());
                int drones = Integer.parseInt(parts[1].trim());
                double mean = Double.parseDouble(parts[2].trim());

                dataMap.putIfAbsent(drones, new ArrayList<>());
                dataMap.get(drones).add(new Double[]{ar, mean});
            }

            // Ordena os valores de AR em ordem crescente
            for (List<Double[]> values : dataMap.values()) {
                values.sort(Comparator.comparingDouble(a -> a[0]));
            }
        }

        return dataMap;
    }

    /**
     * Gera e salva o gráfico a partir dos dados fornecidos.
     */
    public static void generateGraph(
            Map<Integer, List<Double[]>> dataMap,
            String xAxisLabel, String yAxisLabel, String yAxisUnit,
            String fileName, String outputPath, String dirName
    ) throws IOException {

        // Configurações de locale e decimal
        Locale.setDefault(Locale.US);
        DecimalFormatSymbols symbols = new DecimalFormatSymbols();
        symbols.setDecimalSeparator('.');

        // Criação do gráfico
        XYChart chart = new XYChartBuilder()
                .width(800)
                .height(600)
                .theme(Styler.ChartTheme.Matlab)
                .title("")
                .xAxisTitle(xAxisLabel)
                .yAxisTitle(yAxisLabel + " (" + yAxisUnit + ")")
                .build();

        // Adiciona uma linha para cada número de drones
        for (Map.Entry<Integer, List<Double[]>> entry : dataMap.entrySet()) {
            int drones = entry.getKey();
            List<Double[]> values = entry.getValue();

            List<Double> x = values.stream().map(v -> v[0]).collect(Collectors.toList());
            List<Double> y = values.stream().map(v -> v[1]).collect(Collectors.toList());

            chart.addSeries( "Number of Drones = " + drones, x, y);
        }

        // Estilização do gráfico
        chart.getStyler().setLegendPosition(Styler.LegendPosition.InsideNE); //Posiciona a legenda
        chart.getStyler().setPlotGridLinesVisible(false);
        chart.getStyler().setXAxisDecimalPattern("#.##");
        chart.getStyler().setYAxisDecimalPattern("#.##");

        Font axisFont = new Font(Font.SANS_SERIF, Font.BOLD, 23);
        Font legendFont = new Font(Font.SANS_SERIF, Font.BOLD, 18); // ou outro tamanho desejado
        chart.getStyler().setAxisTickLabelsFont(axisFont);
        chart.getStyler().setAxisTitleFont(axisFont);
        chart.getStyler().setLegendFont(axisFont);
        chart.getStyler().setLegendFont(legendFont); // só a legenda menor


        // Criação do diretório de saída
        File outputDir = new File(outputPath + dirName);
        if (!outputDir.exists()) outputDir.mkdirs();

        // Define limites e espaçamento do eixo X


        // Opcional: eixo X e Y com decimais fixos também
        chart.getStyler().setYAxisDecimalPattern("0.00");
        chart.getStyler().setXAxisDecimalPattern("0.00");


        // Salva o gráfico em PNG com 400 DPI
        BitmapEncoder.saveBitmapWithDPI(chart, outputDir + "/" + fileName, BitmapEncoder.BitmapFormat.PNG, 400);
        System.out.println("Gráfico salvo em: " + outputDir.getAbsolutePath());
    }
}
