import pytest
import respx
import httpx
from httpx import AsyncClient, ASGITransport

from soil_up.main import app
from soil_up.services.bdlisa import BdlisaConnector

MOCK_BDLISA_XML = """<?xml version="1.0" encoding="UTF-8"?>
<msGMLOutput xmlns:gml="http://www.opengis.net/gml">
  <EntiteHydroGeol_FXX_layer>
    <EntiteHydroGeol_FXX_feature>
      <CodeEH>125AA01</CodeEH>
      <LibelleEH>Argiles du Gault et Marnes</LibelleEH>
      <OrdreAbsEH>24900</OrdreAbsEH>
      <NiveauEH>3</NiveauEH>
      <NatureEH>7</NatureEH>
      <MilieuEH>1</MilieuEH>
      <EtatEH>X</EtatEH>
    </EntiteHydroGeol_FXX_feature>
    <EntiteHydroGeol_FXX_feature>
      <CodeEH>127AA99</CodeEH>
      <LibelleEH>Sables et graviers de la Seine</LibelleEH>
      <OrdreAbsEH>26900</OrdreAbsEH>
      <NiveauEH>3</NiveauEH>
      <NatureEH>5</NatureEH>
      <MilieuEH>1</MilieuEH>
      <EtatEH>0</EtatEH>
    </EntiteHydroGeol_FXX_feature>
  </EntiteHydroGeol_FXX_layer>
  <ZonKarstiq_FXX_layer>
    <ZonKarstiq_FXX_feature>
      <CodeZK>135AA61_SSC</CodeZK>
      <LibelleZK>Calcaires karstifiés sous couverture</LibelleZK>
      <SituatioZK>2</SituatioZK>
    </ZonKarstiq_FXX_feature>
  </ZonKarstiq_FXX_layer>
</msGMLOutput>
"""

@pytest.mark.asyncio
@respx.mock
async def test_bdlisa_connector_query_point():
    respx.get("https://services.sandre.eaufrance.fr/geo/saq").mock(
        return_value=httpx.Response(200, text=MOCK_BDLISA_XML)
    )
    connector = BdlisaConnector()
    result = await connector.query_point(49.4431, 1.0993)

    assert result.nb_formations == 2
    assert result.formation_affleurante is not None
    assert result.formation_affleurante.code_eh == "125AA01"
    assert "Imperméable" in result.formation_affleurante.nature_libelle

    assert result.aquifere_superficiel is not None
    assert result.aquifere_superficiel.code_eh == "127AA99"
    assert result.aquifere_superficiel.est_aquifere is True
    assert "Poreux" in result.aquifere_superficiel.milieu_libelle

    assert result.karst is not None
    assert result.karst.code_zk == "135AA61_SSC"
    assert result.karst.situation == "Sous couverture"

@pytest.mark.asyncio
@respx.mock
async def test_cadastre_bdlisa_endpoint():
    respx.get("https://services.sandre.eaufrance.fr/geo/saq").mock(
        return_value=httpx.Response(200, text=MOCK_BDLISA_XML)
    )
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/cadastre/bdlisa?lat=49.4431&lon=1.0993")
        assert resp.status_code == 200
        data = resp.json()
        assert data["nb_formations"] == 2
        assert data["aquifere_superficiel"]["code_eh"] == "127AA99"
