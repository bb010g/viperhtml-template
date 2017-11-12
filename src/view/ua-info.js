// @flow
export default (render: *, model: WorkerNavigator) => render`
<p>
  <small> Your user agent string is: </small><br>
  ${model.userAgent}
</p>`;
