(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  if (params.get('autotest') !== '1') return;

  const form = document.getElementById('case-form');
  const input = document.getElementById('case-input');
  if (!form || !input) return;

  input.value = 'Женщина 34 лет. Острый односторонний передний увеит: боль, светобоязнь, перикорнеальная инъекция, фибрин, клетки 3+. В анамнезе HLA-B27-ассоциированный артрит. ВГД 18 мм рт. ст., гипопиона нет, задний отрезок без патологии.';

  window.setTimeout(() => {
    form.requestSubmit();
  }, 150);
}());
