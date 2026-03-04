// ================================================================================================================= //
// Elaborado por: Jorge Andrés Pérez escobar
// Objetivo: Visualizar las series de tiempo de precipitación
// Proyecto para que se elaboró: Inundaciones USAID
// Change Log: 
// - Última modificación: Ajuste de puntos de interés 27-05-2024 por Jorge
// ================================================================================================================= //

// ================================================================================================================= //
// PARAMETRIZACIÓN
// ================================================================================================================= //
//  -- Año de procesamiento --
var year_string = "2020";

// Asset de Terra-i en donde se guardará la imágen de referncia de tiempo seco
var ID_ASSET = 'users/ingperezescobar/floods_Hn/';
var roi = ee.FeatureCollection('users/ingperezescobar/floods_Hn/pais')

var wrapper = require('users/ingperezescobar/preprocess_SAR:wrapper');
var helper = require('users/ingperezescobar/preprocess_SAR:utilities');


var parameter = {//1. Data Selection
              START_DATE: year_string + "-01-01",
              STOP_DATE: year_string + "-12-31",
              POLARIZATION:'VV',
              ORBIT : 'DESCENDING',
              GEOMETRY: roi,
              //2. Additional Border noise correction
              APPLY_ADDITIONAL_BORDER_NOISE_CORRECTION: true,
              //3.Speckle filter
              APPLY_SPECKLE_FILTERING: true,
              SPECKLE_FILTER_FRAMEWORK: 'MULTI',
              SPECKLE_FILTER: 'GAMMA MAP',
              SPECKLE_FILTER_KERNEL_SIZE: 15,
              SPECKLE_FILTER_NR_OF_IMAGES: 10,
              //4. Radiometric terrain normalization
              APPLY_TERRAIN_FLATTENING: false,
              DEM: ee.Image('USGS/SRTMGL1_003'),
              TERRAIN_FLATTENING_MODEL: 'VOLUME',
              TERRAIN_FLATTENING_ADDITIONAL_LAYOVER_SHADOW_BUFFER: 0,
              //5. Output
              FORMAT : 'DB',
              CLIP_TO_ROI: false,
              SAVE_ASSETS: false
}

//---------------------------------------------------------------------------//
// DO THE JOB
//---------------------------------------------------------------------------//
//Preprocess the S1 collection
var s1_preprocces = wrapper.s1_preproc(parameter);
Map.addLayer(s1_preprocces[0].median(),{},"no filtered")
//var s1 = s1_preprocces[0]
var s1collection_filter = s1_preprocces[1]
Map.addLayer(s1collection_filter.median(),{},"filtered")

// print("s1",s1)
// print("s1_preprocces",s1_preprocces)




// ================================================================================================================= //
// FECHAS
// ================================================================================================================= //
// ----- Fechas de proceso ----- //
var startDateSeason = ee.Date(year_string + '-01-01');
var startDateDry = ee.Date(year_string + '-01-01');
var endDateSeason = ee.Date(year_string + '-12-31');
var endDateDry = ee.Date(year_string + '-02-28');

// ----- Cantidad de días dentro del análisis ----- //
var ndays = ee.Number(endDateSeason.difference(startDateSeason,'day'));



// ================================================================================================================= //
// DATOS DE ENTRADA
// ================================================================================================================= //

// ******************************
// ** VECTORES **
// ******************************
// Región de interés se introduce un cuadro que incluya Honduras, para que no se consuma mucha
// memoria en el procesamiento



// Zonas inundadas identificadas por NOAA
var NOAA = ee.FeatureCollection('users/terraiciat/floods/NOAA_20201125_20201129_FloodExtent_Honduras')

// Punto para visualizar la serie de tiempo de índices y precipitación
var punto =ee.Geometry.Point([-86.79146609015095, 15.777723012252007]);


// ******************************
// ** RASTERES **
// ******************************
// A digital elevation model.
var dem = ee.Image('NASA/NASADEM_HGT/001').select('elevation').clip(roi);

// Colección CHIRPS diaria
var chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY");



// ================================================================================================================= //
// CONVERSIÓN DE ELEVACIÓN A PENDIENTE
// ================================================================================================================= //
// Calculate slope. Units are degrees, range is [0,90).
var slope1 = ee.Terrain.slope(dem);

var slope = slope1.resample('bicubic').reproject({
  'crs': slope1.projection(),
  'scale': 10.0}).toInt()

// Seleccionar pendientes menores al 5 grados
slope = slope.lte(6)
slope = slope.updateMask(slope.eq(1))



// ================================================================================================================= //
// CREACIÓN DE IMAGENES DE REFERENCIA PARA TIEMPO DE INUNDACIÓN Y SECO
// ================================================================================================================= //
// Imagen de referencia en tiempo de inundación UNSPIDER
var img_reference_flood_median = s1collection_filter.filterDate('2020-11-10','2020-11-25').median().updateMask(slope);

//Imagen de referencia en tiempo seco UNSPIDER
var img_reference_median = s1collection_filter.filterDate(startDateDry,endDateDry).median().updateMask(slope);
                                              

//Imagen de referencia en tiempo de inundación NDFI
var img_reference_flood_mean = s1collection_filter.filterDate("2020-11-10","2020-11-25").mean().updateMask(slope);

//Imagen de referencia en tiempo seco NDFI
var img_reference_mean = s1collection_filter.filterDate(startDateDry,endDateDry).mean().updateMask(slope);


print("img_reference_flood_median", img_reference_flood_median)
// ================================================================================================================= //
// EXPORTAR IMAGENES DE RETRODISPERSIÓN DE TIEMPOS SECOS E INUNDADOS
// ================================================================================================================= //
Export.image.toAsset({
  image: img_reference_flood_median.select(["VV"]),
  description: 'img_reference_flood_median_retrodispersion',
  assetId: ID_ASSET + 'retrodispersion/img_reference_flood_median_retrodispersion',
  region: geometry_f,
  scale: 10,
  maxPixels: 10000000000000});

Export.image.toAsset({
  image: img_reference_median.select(["VV"]),
  description: 'img_reference_median_retrodispersion',
  assetId: ID_ASSET + 'retrodispersion/img_reference_median_retrodispersion',
  region: geometry_f,
  scale: 10,
  maxPixels: 10000000000000});

Export.image.toAsset({
  image: img_reference_flood_mean.select(["VV"]),
  description: 'img_reference_flood_mean_retrodispersion',
  assetId: ID_ASSET + 'retrodispersion/img_reference_flood_mean_retrodispersion',
  region: geometry_f,
  scale: 10,
  maxPixels: 10000000000000});

Export.image.toAsset({
  image: img_reference_mean.select(["VV"]),
  description: 'img_reference_mean_retrodispersion',
  assetId: ID_ASSET + 'retrodispersion/img_reference_mean_retrodispersion',
  region: geometry_f,
  scale: 10,
  maxPixels: 10000000000000});




Map.centerObject(parameter.GEOMETRY, 12);

//Map.addLayer(s1_view.first(), visparam, 'First image in the input S1 collection', true);
Map.addLayer(img_reference_median.updateMask(slope), {}, 'First image in the processed S1 collection', true);
Map.addLayer(img_reference_flood_median.updateMask(slope), {}, 'First image in the processed S1 collection flooded', true);