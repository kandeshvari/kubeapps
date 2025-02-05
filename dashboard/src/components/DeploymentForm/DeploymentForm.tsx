import { RouterAction } from "connected-react-router";
import * as Moniker from "moniker-native";
import * as React from "react";

import { JSONSchema4 } from "json-schema";
import { IChartState, IChartVersion } from "../../shared/types";
import DeploymentFormBody from "../DeploymentFormBody/DeploymentFormBody";
import { ErrorSelector } from "../ErrorAlert";
import LoadingWrapper from "../LoadingWrapper";

import "react-tabs/style/react-tabs.css";

export interface IDeploymentFormProps {
  kubeappsNamespace: string;
  chartID: string;
  chartVersion: string;
  error: Error | undefined;
  selected: IChartState["selected"];
  deployChart: (
    version: IChartVersion,
    releaseName: string,
    namespace: string,
    values?: string,
    schema?: JSONSchema4,
  ) => Promise<boolean>;
  push: (location: string) => RouterAction;
  fetchChartVersions: (id: string) => void;
  getChartVersion: (id: string, chartVersion: string) => void;
  namespace: string;
  enableBasicForm: boolean;
}

export interface IDeploymentFormState {
  isDeploying: boolean;
  releaseName: string;
  // Name of the release that was submitted for creation
  // This is different than releaseName since it is also used in the error banner
  // and we do not want to use releaseName since it is controller by the form field.
  latestSubmittedReleaseName: string;
  appValues: string;
  valuesModified: boolean;
}

class DeploymentForm extends React.Component<IDeploymentFormProps, IDeploymentFormState> {
  public state: IDeploymentFormState = {
    releaseName: Moniker.choose(),
    appValues: "",
    isDeploying: false,
    latestSubmittedReleaseName: "",
    valuesModified: false,
  };

  public render() {
    const { namespace } = this.props;
    if (this.props.error) {
      return (
        <ErrorSelector
          error={this.props.error}
          namespace={namespace}
          action="create"
          resource={this.state.latestSubmittedReleaseName}
        />
      );
    }
    if (this.state.isDeploying) {
      return <LoadingWrapper />;
    }
    return (
      <form className="container padding-b-bigger" onSubmit={this.handleDeploy}>
        <div className="row">
          <div className="col-12">
            <h2>{this.props.chartID}</h2>
          </div>
          <div className="col-8">
            <div>
              <label htmlFor="releaseName">Name</label>
              <input
                id="releaseName"
                pattern="[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*"
                title="Use lower case alphanumeric characters, '-' or '.'"
                onChange={this.handleReleaseNameChange}
                value={this.state.releaseName}
                required={true}
              />
            </div>
            <DeploymentFormBody
              chartID={this.props.chartID}
              chartVersion={this.props.chartVersion}
              namespace={this.props.namespace}
              selected={this.props.selected}
              push={this.props.push}
              fetchChartVersions={this.props.fetchChartVersions}
              getChartVersion={this.props.getChartVersion}
              enableBasicForm={this.props.enableBasicForm}
              setValues={this.handleValuesChange}
              appValues={this.state.appValues}
              valuesModified={this.state.valuesModified}
              setValuesModified={this.setValuesModified}
            />
          </div>
        </div>
      </form>
    );
  }

  public handleValuesChange = (value: string) => {
    this.setState({ appValues: value });
  };

  public setValuesModified = () => {
    this.setState({ valuesModified: true });
  };

  public handleDeploy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { selected, deployChart, push, namespace } = this.props;
    const { releaseName, appValues } = this.state;

    this.setState({ isDeploying: true, latestSubmittedReleaseName: releaseName });
    if (selected.version) {
      const deployed = await deployChart(
        selected.version,
        releaseName,
        namespace,
        appValues,
        selected.schema,
      );
      this.setState({ isDeploying: false });
      if (deployed) {
        push(`/apps/ns/${namespace}/${releaseName}`);
      }
    }
  };

  public handleReleaseNameChange = (e: React.FormEvent<HTMLInputElement>) => {
    this.setState({ releaseName: e.currentTarget.value });
  };
}

export default DeploymentForm;
