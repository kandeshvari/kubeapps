# This Makefile assumes that you have:
# 1) helm installed 
# 2) minishift installed and a cluster started.
TILLER_NAMESPACE=tiller
KUBEAPPS_NAMESPACE=kubeapps

devel/openshift-tiller-project-created:
	@$(shell minishift oc-env) && \
		oc login -u developer && \
		oc new-project ${TILLER_NAMESPACE} && \
		touch $@

devel/openshift-tiller-with-crd-rbac.yaml: devel/openshift-tiller-project-created
	@$(shell minishift oc-env) && \
		oc process -f ./docs/user/manifests/openshift-tiller-with-crd-rbac.yaml \
			-p TILLER_NAMESPACE="${TILLER_NAMESPACE}" \
			-p HELM_VERSION=v2.14.3 \
			-o yaml \
		> $@

devel/openshift-tiller-with-apprepository-rbac.yaml: devel/openshift-tiller-with-crd-rbac.yaml
	@$(shell minishift oc-env) && \
		oc process -f ./docs/user/manifests/openshift-tiller-with-apprepository-rbac.yaml \
			-p TILLER_NAMESPACE="${TILLER_NAMESPACE}" \
			-p KUBEAPPS_NAMESPACE="${KUBEAPPS_NAMESPACE}" \
			-o yaml \
		> $@

# Openshift requires you to have a project selected when referencing roles, otherwise the following error results:
# Error from server: invalid origin role binding tiller-apprepositories: attempts to reference
# role in namespace "kubeapps" instead of current namespace "tiller"
openshift-install-tiller: devel/openshift-tiller-with-crd-rbac.yaml devel/openshift-tiller-with-apprepository-rbac.yaml devel/openshift-kubeapps-project-created
	$(shell minishift oc-env) && \
		oc login -u system:admin && \
		oc project ${TILLER_NAMESPACE} && \
		oc apply -f devel/openshift-tiller-with-crd-rbac.yaml --wait=true && \
		oc project ${KUBEAPPS_NAMESPACE} && \
		oc apply -f devel/openshift-tiller-with-apprepository-rbac.yaml && \
		helm init --tiller-namespace ${TILLER_NAMESPACE} --service-account tiller --wait && \
		oc login -u developer

devel/openshift-kubeapps-project-created: devel/openshift-tiller-project-created
	@$(shell minishift oc-env) && \
		oc login -u developer && \
		oc new-project ${KUBEAPPS_NAMESPACE} && \
		oc policy add-role-to-user edit "system:serviceaccount:${TILLER_NAMESPACE}:tiller" && \
		touch $@

chart/kubeapps/charts/mongodb-%.tgz:
	helm dep update ./chart/kubeapps

devel/openshift-kubeapps-installed: openshift-install-tiller chart/kubeapps/charts/mongodb-%.tgz
	@$(shell minishift oc-env) && \
		oc project ${KUBEAPPS_NAMESPACE} && \
		helm --tiller-namespace=${TILLER_NAMESPACE} install ./chart/kubeapps -n ${KUBEAPPS_NAMESPACE} \
			--set tillerProxy.host=tiller-deploy.tiller:44134 \
			--values ./docs/user/manifests/kubeapps-local-dev-values.yaml

# Due to openshift having multiple secrets for the service account, the code is slightly different from
# that at https://github.com/kubeapps/kubeapps/blob/master/docs/user/getting-started.md#on-linuxmacos
# TODO: potentially update the docs to use this. Note kubectl jsonpath support
# does not yet support regex filtering, hence the separate grep
# https://github.com/kubernetes/kubernetes/issues/61406
openshift-tiller-token:
	@kubectl get secret -n "${TILLER_NAMESPACE}" \
		$(shell kubectl get serviceaccount -n "${TILLER_NAMESPACE}" tiller -o jsonpath='{range .secrets[*]}{.name}{"\n"}{end}' | grep tiller-token) \
		-o go-template='{{.data.token | base64decode}}' && echo

openshift-kubeapps: devel/openshift-kubeapps-installed

# TODO: Update so all steps carried out even when others fail (otherwise
# resetting an incomplete install will fail.
openshift-kubeapps-reset:
	$(shell minishift oc-env) && \
		oc login -u system:admin && \
		oc delete project ${KUBEAPPS_NAMESPACE} && \
		oc delete project ${TILLER_NAMESPACE} && \
		#oc delete -f devel/openshift-tiller-with-crd-rbac.yaml && \
		#oc delete -f devel/openshift-tiller-with-apprepository-rbac.yaml && \
		oc delete customresourcedefinition apprepositories.kubeapps.com && \
		oc login -u developer && \
		rm devel/openshift-*	

.PHONY: openshift-install-tiller openshift-kubeapps openshift-kubeapps-reset