import { WASTE_DECISION_OPTIONS } from './wasteRegister';

describe('WASTE_DECISION_OPTIONS', () => {
  it('snapshot guards the admin-only catalog against drift', () => {
    expect(WASTE_DECISION_OPTIONS).toMatchSnapshot();
  });
});
