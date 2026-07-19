(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('autotest') !== '1') return;

  const form = document.getElementById('case-form');
  const input = document.getElementById('case-input');
  const provider = document.getElementById('provider-badge');
  const errorBox = document.getElementById('analysis-error');
  if (!form || !input) return;

  input.value = 'Женщина 34 лет. Острый односторонний передний увеит: боль, светобоязнь, перикорнеальная инъекция, фибрин, клетки 3+. В анамнезе HLA-B27-ассоциированный артрит. ВГД 18 мм рт. ст., гипопиона нет, задний отрезок без патологии.';
  document.title = 'Clinical AI — проверка запускается';

  const observer = new MutationObserver(() => {
    if (provider?.textContent && provider.textContent !== '—') {
      document.title = `Clinical AI — ${provider.textContent}`;
      observer.disconnect();
      return;
    }
    if (errorBox && !errorBox.hidden && errorBox.textContent.trim()) {
      document.title = 'Clinical AI — ошибка подключения';
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });

  window.setTimeout(() => {
    form.requestSubmit();
  }, 150);
}());
