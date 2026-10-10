document.addEventListener("DOMContentLoaded", function () {
  const warning = document.createElement("p");
  warning.textContent = "RötgesPortal: Diese Detailansicht zählt reduzierte Log-Requests. Sämtliche Besucherwerte sind ungültig, da IP-Adressen und Request-Header vor dem Speichern entfernt werden. Die Zeitverteilung umfasst alle ausgewerteten Log-Tage. Tages- und heutige Stundenwerte stehen in der privaten Übersicht.";
  warning.style.cssText = "padding:16px;margin:0;background:#fff0c2;color:#222;font:16px/1.5 system-ui;position:relative;z-index:1000";
  const link = document.createElement("a");
  link.href = "index.html";
  link.textContent = " Zur Tagesübersicht";
  warning.append(link);
  document.body.prepend(warning);
});
