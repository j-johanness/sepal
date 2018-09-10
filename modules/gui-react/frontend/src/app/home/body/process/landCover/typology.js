import {RecipeActions, recipePath, RecipeState} from './landCoverRecipe'
import PropTypes from 'prop-types'
import React from 'react'
import {msg} from 'translate'
import {form} from 'widget/form'
import {Panel, PanelContent, PanelHeader} from 'widget/panel'
import PanelButtons from 'widget/panelButtons'
import styles from './typology.module.css'

const fields = {}

const mapStateToProps = (state, ownProps) => {
    const recipeId = ownProps.recipeId
    const recipeState = RecipeState(recipeId)
    let values = recipeState('ui.typology')
    if (!values) {
        const model = recipeState('model.typology')
        values = modelToValues(model)
        RecipeActions(recipeId).setTypology({values, model}).dispatch()
    }
    return {values}
}

class Typology extends React.Component {
    constructor(props) {
        super(props)
        const {recipeId} = props
        this.recipeActions = RecipeActions(recipeId)
    }


    render() {
        const {recipeId, form} = this.props
        return (
            <Panel className={styles.panel}>
                <PanelHeader
                    icon='cog'
                    title={msg('process.landCover.panel.typology.title')}/>

                <PanelContent>
                    {this.renderContent()}
                </PanelContent>

                <PanelButtons
                    statePath={recipePath(recipeId, 'ui')}
                    form={form}
                    onApply={values => this.recipeActions.setTypology({
                        values,
                        model: valuesToModel(values)
                    }).dispatch()}/>
            </Panel>
        )
    }

    renderContent() {
        return (
            <div className={styles.content}>
                Select (or create?) a typology somehow here.
            </div>
        )
    }
}

Typology.propTypes = {
    recipeId: PropTypes.string,
}

export default form({fields, mapStateToProps})(Typology)

const valuesToModel = (values) => ({
    ...values
})

const modelToValues = (model = {}) => ({
    ...model
})