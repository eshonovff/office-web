import { customerFlowBuilderApi } from '~/api/customerFlows';
import { FlowBuilderApiProvider } from '~/lib/flowBuilderApi';
import FlowCanvasPage from '~/routes/(app)/automations/flows/id/route';

// The staff Flow Builder, unchanged, pointed at the мизоҷ API (/api/public) and the мизоҷ's
// URLs. What it can load or save is decided by the backend, which scopes every call to the
// мизоҷ — another owner's flow id is a 404 here.
export default function CustomerFlowEditorPage() {
  return (
    <FlowBuilderApiProvider value={customerFlowBuilderApi}>
      <FlowCanvasPage />
    </FlowBuilderApiProvider>
  );
}
