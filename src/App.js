import React from 'react';
import { connect } from 'react-redux';
import QuestionList from './components/QuestionList';

const AppDisplay = () => (
    <div>
        <h1>
            Isomorphic React
        </h1>
        <div>
            <QuestionList />
        </div>
    </div>
);

const mapStateToProps = (state, ownProps) => {
    return {
        ...state
    }
};

// export default AppDisplay;
export default connect(mapStateToProps)(AppDisplay);