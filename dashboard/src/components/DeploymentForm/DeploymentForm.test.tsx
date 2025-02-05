import { mount, shallow } from "enzyme";
import * as Moniker from "moniker-native";
import * as React from "react";

import { IChartState, IChartVersion, UnprocessableEntity } from "../../shared/types";
import DeploymentFormBody from "../DeploymentFormBody/DeploymentFormBody";
import { ErrorSelector } from "../ErrorAlert";
import DeploymentForm from "./DeploymentForm";

const defaultProps = {
  kubeappsNamespace: "kubeapps",
  chartID: "foo",
  chartVersion: "1.0.0",
  error: undefined,
  selected: {} as IChartState["selected"],
  deployChart: jest.fn(),
  push: jest.fn(),
  fetchChartVersions: jest.fn(),
  getChartVersion: jest.fn(),
  namespace: "default",
  enableBasicForm: false,
};
const versions = [{ id: "foo", attributes: { version: "1.2.3" } }] as IChartVersion[];
let monikerChooseMock: jest.Mock;

beforeEach(() => {
  monikerChooseMock = jest.fn();
  Moniker.choose = monikerChooseMock;
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("renders an error", () => {
  it("renders a custom error if the deployment failed", () => {
    const wrapper = shallow(
      <DeploymentForm
        {...defaultProps}
        selected={
          {
            version: { attributes: {} },
            versions: [{ id: "foo", attributes: {} }],
          } as IChartState["selected"]
        }
        error={new UnprocessableEntity("wrong format!")}
      />,
    );
    wrapper.setState({ latestSubmittedReleaseName: "my-app" });
    expect(wrapper.find(ErrorSelector).exists()).toBe(true);
    expect(wrapper.find(ErrorSelector).html()).toContain(
      "Sorry! Something went wrong processing my-app",
    );
    expect(wrapper.find(ErrorSelector).html()).toContain("wrong format!");
  });

  it("the error does not change if the release name changes", () => {
    const expectedErrorMsg = "Sorry! Something went wrong processing my-app";

    const wrapper = shallow(
      <DeploymentForm
        {...defaultProps}
        selected={
          {
            version: { attributes: {} },
            versions: [{ id: "foo", attributes: {} }],
          } as IChartState["selected"]
        }
        error={new UnprocessableEntity("wrong format!")}
      />,
    );

    wrapper.setState({ latestSubmittedReleaseName: "my-app" });
    expect(wrapper.find(ErrorSelector).exists()).toBe(true);
    expect(wrapper.find(ErrorSelector).html()).toContain(expectedErrorMsg);
    wrapper.setState({ releaseName: "another-app" });
    expect(wrapper.find(ErrorSelector).html()).toContain(expectedErrorMsg);
  });
});

it("renders the full DeploymentForm", () => {
  const wrapper = shallow(
    <DeploymentForm {...defaultProps} selected={{ versions, version: versions[0] }} />,
  );
  expect(wrapper).toMatchSnapshot();
});

it("renders a release name by default, relying in Monickers output", () => {
  monikerChooseMock.mockImplementationOnce(() => "foo").mockImplementationOnce(() => "bar");

  let wrapper = shallow(
    <DeploymentForm {...defaultProps} selected={{ versions, version: versions[0] }} />,
  );
  const name1 = wrapper.state("releaseName") as string;
  expect(name1).toBe("foo");

  // When reloading the name should change
  wrapper = shallow(
    <DeploymentForm {...defaultProps} selected={{ versions, version: versions[0] }} />,
  );
  const name2 = wrapper.state("releaseName") as string;
  expect(name2).toBe("bar");
});

it("forwards the appValues when modified", () => {
  const wrapper = shallow(<DeploymentForm {...defaultProps} />);
  const handleValuesChange: (v: string) => void = wrapper
    .find(DeploymentFormBody)
    .prop("setValues");
  handleValuesChange("foo: bar");

  expect(wrapper.state("appValues")).toBe("foo: bar");
  expect(wrapper.find(DeploymentFormBody).prop("appValues")).toBe("foo: bar");
});

it("forwards the valuesModifed property", () => {
  const wrapper = shallow(<DeploymentForm {...defaultProps} />);
  const handleValuesModified: (v: string) => void = wrapper
    .find(DeploymentFormBody)
    .prop("setValuesModified");
  handleValuesModified("foo: bar");

  expect(wrapper.state("valuesModified")).toBe(true);
  expect(wrapper.find(DeploymentFormBody).prop("valuesModified")).toBe(true);
});

it("triggers a deployment when submitting the form", done => {
  const releaseName = "my-release";
  const namespace = "default";
  const appValues = "foo: bar";
  const schema = { properties: { foo: { type: "string", form: "foo" } } };
  const deployChart = jest.fn(() => true);
  const push = jest.fn();
  const wrapper = mount(
    <DeploymentForm
      {...defaultProps}
      selected={{ versions, version: versions[0], schema }}
      deployChart={deployChart}
      push={push}
      namespace={namespace}
    />,
  );
  wrapper.setState({ releaseName, appValues });
  wrapper.find("form").simulate("submit");
  expect(deployChart).toHaveBeenCalledWith(versions[0], releaseName, namespace, appValues, schema);
  setTimeout(() => {
    expect(push).toHaveBeenCalledWith("/apps/ns/default/my-release");
    done();
  }, 1);
});
